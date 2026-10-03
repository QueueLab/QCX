import type { MapMarker } from '@/components/map/map-data-context'

export interface LocationEmbeddingsMapUpdate {
  targetPosition?: { lat: number; lng: number }
  targetGeometry?: GeoJSON.Geometry
  markers: MapMarker[]
  features: Array<{
    id: string
    geometry: GeoJSON.Geometry
    title: string
    source: 'lgnd-aoi' | 'lgnd-chip'
  }>
}

function isValidLatitudeLongitude(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function resultItems(payload: Record<string, any>): any[] {
  const results = payload.results
  if (Array.isArray(results)) return results
  if (!results || typeof results !== 'object') return []
  for (const key of ['results', 'items', 'data', 'chips']) {
    if (Array.isArray(results[key])) return results[key]
  }
  return []
}

function asGeoJsonGeometry(value: unknown): GeoJSON.Geometry | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const candidate = value as Record<string, any>
  const geometry = candidate.type === 'Feature' ? candidate.geometry : candidate
  if (!geometry || typeof geometry !== 'object') return undefined
  if (!['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(geometry.type)) {
    return undefined
  }
  if (!Array.isArray(geometry.coordinates)) return undefined

  let hasPosition = false
  const visit = (node: unknown): boolean => {
    if (!Array.isArray(node)) return false
    if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      hasPosition = true
      return isValidLatitudeLongitude(node[1], node[0])
    }
    return node.length > 0 && node.every(visit)
  }
  if (!visit(geometry.coordinates) || !hasPosition) return undefined
  return geometry as GeoJSON.Geometry
}

function geometryCenter(geometry: GeoJSON.Geometry): { lat: number; lng: number } | undefined {
  const positions: Array<[number, number]> = []
  const visit = (node: unknown) => {
    if (!Array.isArray(node)) return
    if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      positions.push([node[0], node[1]])
      return
    }
    node.forEach(visit)
  }
  if ('coordinates' in geometry) visit(geometry.coordinates)
  if (!positions.length) return undefined
  const longitudes = positions.map(([lng]) => lng)
  const latitudes = positions.map(([, lat]) => lat)
  return {
    lng: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    lat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2
  }
}

/** Convert a persisted LGND tool response into map state, preserving GeoJSON [lng, lat] order. */
export function buildLocationEmbeddingsMapUpdate(
  value: unknown
): LocationEmbeddingsMapUpdate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const payload = value as Record<string, any>
  if (payload.error) return null

  const queryLabel =
    (typeof payload.location === 'string' && payload.location.trim()) ||
    (typeof payload.query === 'string' && payload.query.trim()) ||
    'LGND location search'
  const markers: MapMarker[] = []
  const features: LocationEmbeddingsMapUpdate['features'] = []
  const hasSearchCoordinate = isValidLatitudeLongitude(payload.latitude, payload.longitude)
  const items = resultItems(payload).slice(0, 3)

  const apiArea = payload.results && typeof payload.results === 'object'
    ? payload.results.areaOfInterest || payload.results.area_of_interest || payload.results.aoi || payload.results.geometry
    : undefined
  const searchGeometry =
    asGeoJsonGeometry(payload.areaOfInterest) ||
    asGeoJsonGeometry(payload.searchGeometry) ||
    asGeoJsonGeometry(apiArea)

  if (searchGeometry) {
    features.push({
      id: `lgnd:aoi:${payload.latitude ?? 'na'}:${payload.longitude ?? 'na'}:${queryLabel}`,
      geometry: searchGeometry,
      title: `LGND area of interest: ${queryLabel}`,
      source: 'lgnd-aoi'
    })
  }

  let firstResultPosition: { lat: number; lng: number } | undefined

  for (const [index, item] of items.entries()) {
    if (!item || typeof item !== 'object') continue
    const coordinates = item.centroid?.coordinates
    let resultPosition: { lat: number; lng: number } | undefined

    // LGND centroids are GeoJSON positions: [longitude, latitude].
    if (Array.isArray(coordinates) && isValidLatitudeLongitude(coordinates[1], coordinates[0])) {
      resultPosition = { lat: coordinates[1], lng: coordinates[0] }
      firstResultPosition ??= resultPosition
    }

    const chipId = String(item.chip_id || item.chipId || item.id || `result-${index + 1}`)
    const geometry = asGeoJsonGeometry(
      item.geometry || item.geojson || item.footprint || item.chip_geometry || item.chip?.geometry
    )
    if (geometry) {
      features.push({
        id: `lgnd:chip:${chipId}`,
        geometry,
        title: `LGND result: ${chipId}`,
        source: 'lgnd-chip'
      })
      resultPosition ||= geometryCenter(geometry)
      firstResultPosition ??= resultPosition
    }

    if (!resultPosition) continue
    const detailParts = [
      item.collection ? `Collection: ${String(item.collection)}` : undefined,
      typeof item.datetime === 'string' ? `Date: ${item.datetime.split('T')[0]}` : undefined,
      item.score !== undefined ? `Score: ${String(item.score)}` : undefined,
      `Centroid (${resultPosition.lat.toFixed(6)}, ${resultPosition.lng.toFixed(6)})`
    ].filter(Boolean)

    markers.push({
      id: `lgnd:chip:${chipId}`,
      latitude: resultPosition.lat,
      longitude: resultPosition.lng,
      title: `LGND result: ${chipId}`,
      details: detailParts.join(' · '),
      source: 'lgnd-chip',
      ...(geometry ? { geometry } : {})
    })
  }

  // The explicit search coordinate is authoritative; otherwise fit the returned AOI,
  // then fall back to the first chip centroid.
  const targetPosition = hasSearchCoordinate
    ? { lat: payload.latitude as number, lng: payload.longitude as number }
    : searchGeometry
      ? geometryCenter(searchGeometry)
      : firstResultPosition
  const targetGeometry = searchGeometry || features.find(feature => feature.source === 'lgnd-chip')?.geometry

  if (hasSearchCoordinate) {
    markers.unshift({
      id: `lgnd:search:${payload.latitude}:${payload.longitude}`,
      latitude: payload.latitude as number,
      longitude: payload.longitude as number,
      title: `LGND search: ${queryLabel}`,
      details: searchGeometry ? `Search area of interest · (${(payload.latitude as number).toFixed(6)}, ${(payload.longitude as number).toFixed(6)})` : `Search coordinate (${(payload.latitude as number).toFixed(6)}, ${(payload.longitude as number).toFixed(6)})`,
      source: 'lgnd-search'
    })
  }

  return { targetPosition, targetGeometry, markers, features }
}
