import { MAX_LGND_RESULTS } from '@/lib/schema/location-embeddings'

export interface PersistedAnalysisMessage {
  role?: string
  type?: string
  name?: string
  content?: unknown
}

const MAX_CONTEXT_CHARS = 9_000
const MAX_CONTEXT_RECORDS = 8
const MAX_RESOLUTION_SUMMARY_CHARS = 1_100
const MAX_TEXT_FIELD_CHARS = 180

type ContextRecord = {
  kind: 'resolution-search' | 'lgnd-imagery-search'
  details: Record<string, unknown>
}

function parseObjectContent(content: unknown): Record<string, any> | undefined {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content as Record<string, any>
  }
  if (typeof content !== 'string') return undefined
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : undefined
  } catch {
    return undefined
  }
}

function text(value: unknown, limit = MAX_TEXT_FIELD_CHARS): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, limit) : undefined
}

function validCoordinate(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
}

function centroid(value: any): { latitude: number; longitude: number } | undefined {
  if (Array.isArray(value?.coordinates) && value.coordinates.length >= 2 &&
      validCoordinate(value.coordinates[1], value.coordinates[0])) {
    // GeoJSON positions are ordered [longitude, latitude].
    return { latitude: value.coordinates[1], longitude: value.coordinates[0] }
  }
  const latitude = value?.latitude ?? value?.lat
  const longitude = value?.longitude ?? value?.lng ?? value?.lon
  return validCoordinate(latitude, longitude) ? { latitude, longitude } : undefined
}

function resolutionRecord(payload: Record<string, any>): ContextRecord {
  const features = Array.isArray(payload.geoJson?.features)
    ? payload.geoJson.features.slice(0, 5).map((feature: any) => ({
        name: text(feature?.properties?.name, 100),
        description: text(feature?.properties?.description, 160),
        geometryType: text(feature?.geometry?.type || feature?.geometryType, 40)
      })).filter((feature: any) => feature.name || feature.description || feature.geometryType)
    : []
  const details: Record<string, unknown> = {
    summary: text(payload.summary, MAX_RESOLUTION_SUMMARY_CHARS),
    coordinates: validCoordinate(payload.extractedLatitude, payload.extractedLongitude)
      ? { latitude: payload.extractedLatitude, longitude: payload.extractedLongitude }
      : undefined,
    cogApplicable: typeof payload.cogApplicable === 'boolean' ? payload.cogApplicable : undefined,
    cogDescription: text(payload.cogDescription, 300),
    features: features.length ? features : undefined
  }
  return { kind: 'resolution-search', details }
}

function resultItems(payload: Record<string, any>): any[] {
  const raw = payload.results
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return []
  for (const key of ['results', 'items', 'data', 'chips']) {
    if (Array.isArray(raw[key])) return raw[key]
  }
  return []
}

function lgndRecord(payload: Record<string, any>): ContextRecord {
  const rawItems = resultItems(payload)
  const indexed = Array.isArray(payload.indexedChips) ? payload.indexedChips : []
  const itemsById = new Map<string, any>()
  for (const item of rawItems) {
    const id = item?.chip_id || item?.chipId || item?.id
    if (id) itemsById.set(String(id), item)
  }
  for (const item of indexed) {
    const id = item?.chip_id || item?.chipId || item?.id
    if (id) itemsById.set(String(id), { ...(itemsById.get(String(id)) || {}), ...item })
  }

  const chips = Array.from(itemsById.entries()).slice(0, MAX_LGND_RESULTS).map(([chipId, item]) => ({
    chipId: text(chipId, 100),
    collection: text(item.collection || item.collection_name || item.collectionId),
    acquisitionDate: text(item.datetime || item.acquisition_datetime || item.acquisition_date || item.date, 60),
    score: typeof item.score === 'number' && Number.isFinite(item.score)
      ? item.score
      : text(item.score ?? item.match_score, 60),
    centroid: centroid(item.centroid || item.center || item.coordinates)
  })).filter((item: any) => item.chipId)

  const details: Record<string, unknown> = {
    query: text(payload.query, 240),
    location: text(payload.location, 160),
    searchCoordinate: validCoordinate(payload.latitude, payload.longitude)
      ? { latitude: payload.latitude, longitude: payload.longitude }
      : undefined,
    collectionId: text(payload.collectionId, 120),
    chips: chips.length ? chips : undefined,
    error: text(payload.error, 300)
  }
  return { kind: 'lgnd-imagery-search', details }
}

/**
 * Rebuild compact analysis/search context from durable message payloads rather
 * than relying on the current prompt window. It intentionally omits images,
 * signed thumbnail URLs, raw API responses, and full GeoJSON coordinates.
 */
export function buildPersistedAnalysisContext(messages: PersistedAnalysisMessage[]): string {
  if (!Array.isArray(messages)) return ''

  const records: ContextRecord[] = []
  for (const message of messages) {
    if (message?.type === 'resolution_search_result') {
      const payload = parseObjectContent(message.content)
      if (payload) records.push(resolutionRecord(payload))
      continue
    }

    if (message?.name === 'locationEmbeddingsQuery' && (message.role === 'tool' || message.type === 'tool')) {
      const payload = parseObjectContent(message.content)
      if (payload) records.push(lgndRecord(payload))
    }
  }

  const latestRecords = records.slice(-MAX_CONTEXT_RECORDS)
  while (latestRecords.length) {
    const serialized = JSON.stringify({ records: latestRecords })
    if (serialized.length <= MAX_CONTEXT_CHARS) {
      // Escape angle brackets so stored/search text cannot close prompt delimiters.
      return serialized.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    }
    latestRecords.shift()
  }
  return ''
}
