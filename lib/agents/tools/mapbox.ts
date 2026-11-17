import { createDeadlineSignal } from '@/lib/utils/with-timeout'

const MAPBOX_TIMEOUT_MS = 10_000

export interface MapboxPlace {
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  bbox?: [number, number, number, number]
  category?: string
}

export interface MapboxRoute {
  distanceKm: number
  durationMin: number
  profile: string
}

export function getMapboxToken(): string {
  return (
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    ''
  ).trim()
}

async function mapboxGet(url: URL): Promise<any> {
  const token = getMapboxToken()
  if (!token) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured.')
  }
  url.searchParams.set('access_token', token)
  const res = await fetch(url.toString(), {
    method: 'GET',
    signal: createDeadlineSignal(MAPBOX_TIMEOUT_MS)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Mapbox API returned HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }
  return res.json()
}

function toPlace(feature: any): MapboxPlace | null {
  if (!feature) return null
  const props = feature.properties || {}
  const coords = props.coordinates
  const center = Array.isArray(feature.geometry?.coordinates)
    ? feature.geometry.coordinates
    : feature.center
  const latitude = typeof coords?.latitude === 'number' ? coords.latitude : center?.[1]
  const longitude = typeof coords?.longitude === 'number' ? coords.longitude : center?.[0]
  return {
    name: props.name || feature.text || props.name_preferred,
    address: props.full_address || props.place_formatted || props.address || feature.place_name,
    latitude: typeof latitude === 'number' ? latitude : undefined,
    longitude: typeof longitude === 'number' ? longitude : undefined,
    bbox: Array.isArray(props.bbox) ? props.bbox : Array.isArray(feature.bbox) ? feature.bbox : undefined,
    category: Array.isArray(props.poi_category) ? props.poi_category[0] : undefined
  }
}

const proximityParam = (proximity?: { latitude: number; longitude: number }) =>
  proximity ? `${proximity.longitude},${proximity.latitude}` : undefined

/** Forward geocoding for addresses, cities, regions and landmarks (Geocoding v6). */
export async function geocodePlace(
  query: string,
  options: { limit?: number; proximity?: { latitude: number; longitude: number } } = {}
): Promise<MapboxPlace[]> {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(Math.min(options.limit ?? 5, 10)))
  const proximity = proximityParam(options.proximity)
  if (proximity) url.searchParams.set('proximity', proximity)
  const data = await mapboxGet(url)
  return (data?.features || []).map(toPlace).filter(Boolean) as MapboxPlace[]
}

/** POI / business search (Search Box API), falling back to geocoding when no POIs match. */
export async function searchPlaces(
  query: string,
  options: { limit?: number; proximity?: { latitude: number; longitude: number } } = {}
): Promise<MapboxPlace[]> {
  const url = new URL('https://api.mapbox.com/search/searchbox/v1/forward')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(Math.min(options.limit ?? 5, 10)))
  const proximity = proximityParam(options.proximity)
  if (proximity) url.searchParams.set('proximity', proximity)
  try {
    const data = await mapboxGet(url)
    const places = (data?.features || []).map(toPlace).filter(Boolean) as MapboxPlace[]
    if (places.length > 0) return places
  } catch (error) {
    console.warn('[Mapbox] Search Box request failed, falling back to geocoding:', error)
  }
  return geocodePlace(query, options)
}

export async function reverseGeocode(latitude: number, longitude: number, limit = 1): Promise<MapboxPlace[]> {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('limit', String(Math.min(limit, 5)))
  const data = await mapboxGet(url)
  return (data?.features || []).map(toPlace).filter(Boolean) as MapboxPlace[]
}

export async function getRoute(
  origin: MapboxPlace,
  destination: MapboxPlace,
  mode: string = 'driving'
): Promise<MapboxRoute> {
  const profile = mode === 'walking' || mode === 'cycling' ? mode : 'driving'
  const path = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${path}`)
  url.searchParams.set('overview', 'false')
  const data = await mapboxGet(url)
  const route = data?.routes?.[0]
  if (!route) throw new Error('No route found between the requested locations.')
  return {
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMin: Math.round(route.duration / 60),
    profile
  }
}

/** Static map preview URL; only built with a public (pk.) token because the URL is sent to the browser. */
export function getStaticMapUrl(points: MapboxPlace[]): string | undefined {
  const publicToken = (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim() ||
    (getMapboxToken().startsWith('pk.') ? getMapboxToken() : '')
  const valid = points.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number')
  if (!publicToken || valid.length === 0) return undefined
  const markers = valid
    .slice(0, 10)
    .map(p => `pin-s+e11d48(${p.longitude!.toFixed(5)},${p.latitude!.toFixed(5)})`)
    .join(',')
  const view = valid.length === 1
    ? `${valid[0].longitude!.toFixed(5)},${valid[0].latitude!.toFixed(5)},13`
    : 'auto'
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markers}/${view}/640x360@2x?access_token=${publicToken}`
}
