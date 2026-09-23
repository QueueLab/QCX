import { createStreamableValue } from 'ai/rsc'
import { locationEmbeddingsQuerySchema } from '@/lib/schema/location-embeddings'
import { ToolProps } from '.'
import { LocationEmbeddingsSection } from '@/components/location-embeddings-section'
import { createDeadlineSignal } from '@/lib/utils/with-timeout'

const DEFAULT_TENANT_ID = 'ten_01a0cd9a20c671b59c2cf55ee847bc66'
const DEFAULT_COLLECTION_ID = 'col_01a0cd9a20e170daac4573a3f7200000'
const EMBEDDINGS_API_BASE = 'https://embeddings.api.lgnd.ai/v1'
const MAPBOX_GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

type SearchResult = {
  chip_id?: string
  score?: number
  distance?: number
  datetime?: string
  collection?: string
  centroid?: { coordinates?: number[] }
}

type Thumbnail = {
  url: string
  expires_at?: string
  chip_id: string
}

type GeoJSONGeometry = {
  type: 'Point' | 'MultiPoint' | 'Polygon' | 'MultiPolygon'
  coordinates: unknown
}

function authorizationHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
  }
}

function bboxToPolygon(bbox: number[]): GeoJSONGeometry | undefined {
  if (bbox.length !== 4 || bbox.some(value => !Number.isFinite(value))) return undefined
  const [west, south, east, north] = bbox
  return {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south]
    ]]
  }
}

async function geocodeLocation(location: string): Promise<{
  geometry?: GeoJSONGeometry
  latitude?: number
  longitude?: number
  label: string
}> {
  const token = process.env.MAPBOX_ACCESS_TOKEN
  if (!token) {
    throw new Error(
      'MAPBOX_ACCESS_TOKEN is not configured; provide coordinates or configure Mapbox geocoding.'
    )
  }

  const url = `${MAPBOX_GEOCODING_BASE}/${encodeURIComponent(location)}.json?limit=1&access_token=${encodeURIComponent(token)}`
  const response = await fetch(url, {
    method: 'GET',
    signal: createDeadlineSignal(15_000)
  })
  if (!response.ok) {
    throw new Error(`Mapbox geocoding returned HTTP ${response.status}`)
  }

  const payload = (await response.json()) as {
    features?: Array<{
      place_name?: string
      center?: [number, number]
      bbox?: number[]
      geometry?: GeoJSONGeometry
    }>
  }
  const feature = payload.features?.[0]
  if (!feature) throw new Error(`Mapbox could not resolve location: ${location}`)

  const center = feature.center
  const geometry =
    feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
      ? feature.geometry
      : feature.bbox
        ? bboxToPolygon(feature.bbox)
        : undefined

  return {
    geometry,
    longitude: center?.[0],
    latitude: center?.[1],
    label: feature.place_name || location
  }
}

async function getThumbnail(
  chipId: string,
  headers: Record<string, string>
): Promise<Thumbnail | null> {
  const response = await fetch(
    `${EMBEDDINGS_API_BASE}/chips/${encodeURIComponent(chipId)}/thumbnail/url`,
    {
      method: 'GET',
      headers,
      signal: createDeadlineSignal(15_000)
    }
  )

  if (!response.ok) {
    console.warn(`Unable to fetch thumbnail URL for chip ${chipId}: HTTP ${response.status}`)
    return null
  }

  const payload = (await response.json()) as { url?: unknown; expires_at?: string }
  return typeof payload.url === 'string'
    ? { chip_id: chipId, url: payload.url, expires_at: payload.expires_at }
    : null
}

export const locationEmbeddingsTool = ({ uiStream }: ToolProps) => ({
  description:
    'Search satellite or aerial image embeddings using a natural-language description and an optional place name. Geocodes the place with Mapbox and searches LGND by text within that region. Use this for imagery similarity, land-use, vegetation, or construction searches; not ordinary directions or place lookup.',
  parameters: locationEmbeddingsQuerySchema,
  execute: async ({
    query,
    location,
    latitude,
    longitude,
    top_k = 10,
    start_date,
    end_date
  }: {
    query: string
    location?: string
    latitude?: number
    longitude?: number
    top_k?: number
    start_date?: string
    end_date?: string
  }) => {
    const streamResults = createStreamableValue<string>()
    uiStream.append(<LocationEmbeddingsSection result={streamResults.value} />)

    const tenantId = process.env.LGND_TENANT_ID || DEFAULT_TENANT_ID
    const collectionId = process.env.LGND_COLLECTION_ID || DEFAULT_COLLECTION_ID
    const apiKey =
      process.env.LGND_EMBEDDINGS_API_KEY ||
      process.env.EMBEDDINGS_API_KEY ||
      process.env.LGND_API_KEY ||
      ''

    const finishError = (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      const payload = { query, location, latitude, longitude, top_k, error: message }
      streamResults.done(JSON.stringify(payload))
      return payload
    }

    if (!apiKey) {
      return finishError(
        'LGND embeddings credentials are not configured. Set LGND_EMBEDDINGS_API_KEY on the server.'
      )
    }

    try {
      let resolvedLocation = location
      let resolvedLatitude = latitude
      let resolvedLongitude = longitude
      let geometry: GeoJSONGeometry | undefined

      if (location) {
        const geocoded = await geocodeLocation(location)
        resolvedLocation = geocoded.label
        resolvedLatitude = geocoded.latitude
        resolvedLongitude = geocoded.longitude
        geometry = geocoded.geometry
      } else if ((latitude === undefined) !== (longitude === undefined)) {
        throw new Error('Provide both latitude and longitude, or provide a place name.')
      }

      const url = `${EMBEDDINGS_API_BASE}/tenants/${encodeURIComponent(tenantId)}/collections/${encodeURIComponent(collectionId)}/search-by-text`
      const headers = authorizationHeaders(apiKey)
      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: createDeadlineSignal(15_000),
        body: JSON.stringify({
          query,
          top_k,
          ...(start_date ? { start_date } : {}),
          ...(end_date ? { end_date } : {}),
          ...(geometry ? { geometry } : {})
        })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(
          `Embeddings API returned HTTP ${response.status}: ${errorText || response.statusText}`
        )
      }

      const apiResponse = (await response.json()) as {
        data?: SearchResult[]
        _meta?: unknown
      }
      const results = Array.isArray(apiResponse.data) ? apiResponse.data : []
      const thumbnails = (
        await Promise.all(
          results
            .filter((result): result is SearchResult & { chip_id: string } =>
              typeof result.chip_id === 'string' && result.chip_id.length > 0
            )
            .map(result => getThumbnail(result.chip_id, headers).catch(() => null))
        )
      ).filter((thumbnail): thumbnail is Thumbnail => thumbnail !== null)

      const payload = {
        query,
        location: resolvedLocation,
        latitude: resolvedLatitude,
        longitude: resolvedLongitude,
        geometry,
        top_k,
        tenantId,
        collectionId,
        results: apiResponse,
        images: thumbnails,
        formattedResult: `\`\`\`json\n${JSON.stringify(apiResponse, null, 2)}\n\`\`\``
      }
      streamResults.done(JSON.stringify(payload))
      return payload
    } catch (error: unknown) {
      console.error('Natural-language location embeddings error:', error)
      return finishError(error)
    }
  }
})

export { geocodeLocation, getThumbnail }
