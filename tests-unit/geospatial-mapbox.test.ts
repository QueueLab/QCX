import { describe, expect, it, mock } from 'bun:test'

mock.module('ai/rsc', () => ({
  createStreamableValue: (value: any) => ({ value, update: () => {}, done: () => {} }),
  createStreamableUI: () => ({ append: () => {}, update: () => {} })
}))
mock.module('@/components/message', () => ({ BotMessage: () => null }))
mock.module('@/lib/actions/users', () => ({ getSelectedModel: async () => 'test-model' }))

const { runMapboxQuery, geospatialTool } = await import('../lib/agents/tools/geospatial')

function mockFetch(handler: (url: URL) => any) {
  const calls: URL[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(input.toString())
    calls.push(url)
    const body = handler(url)
    return body === undefined
      ? new Response('Not found', { status: 404 })
      : new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = original } }
}

const geocodeFeature = (name: string, longitude: number, latitude: number) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [longitude, latitude] },
  properties: { name, full_address: `${name}, Somewhere`, coordinates: { longitude, latitude } }
})

describe('Mapbox geospatial tool', () => {
  it('geocodes a place via the Mapbox Geocoding v6 API', async () => {
    process.env.MAPBOX_ACCESS_TOKEN = 'sk.test'
    const { calls, restore } = mockFetch(url =>
      url.pathname === '/search/geocode/v6/forward'
        ? { features: [geocodeFeature('Eiffel Tower', 2.2945, 48.8584)] }
        : undefined
    )
    try {
      const result = await runMapboxQuery({ queryType: 'geocode', location: 'Eiffel Tower' } as any)
      expect(calls[0].searchParams.get('q')).toBe('Eiffel Tower')
      expect(calls[0].searchParams.get('access_token')).toBe('sk.test')
      expect(result.location).toMatchObject({ place_name: 'Eiffel Tower', latitude: 48.8584, longitude: 2.2945 })
    } finally {
      restore()
    }
  })

  it('searches POIs and falls back to geocoding when Search Box has no matches', async () => {
    process.env.MAPBOX_ACCESS_TOKEN = 'sk.test'
    const { calls, restore } = mockFetch(url => {
      if (url.pathname === '/search/searchbox/v1/forward') return { features: [] }
      if (url.pathname === '/search/geocode/v6/forward') return { features: [geocodeFeature('Union Square', -122.4075, 37.788)] }
    })
    try {
      const result = await runMapboxQuery({ queryType: 'search', query: 'Union Square', maxResults: 3 } as any)
      expect(calls.map(c => c.pathname)).toEqual(['/search/searchbox/v1/forward', '/search/geocode/v6/forward'])
      expect(result.results).toHaveLength(1)
      expect(result.location.place_name).toBe('Union Square')
    } finally {
      restore()
    }
  })

  it('returns route distance and duration for directions', async () => {
    process.env.MAPBOX_ACCESS_TOKEN = 'sk.test'
    const { calls, restore } = mockFetch(url => {
      if (url.pathname === '/search/geocode/v6/forward') {
        return url.searchParams.get('q') === 'LAX'
          ? { features: [geocodeFeature('LAX', -118.4085, 33.9416)] }
          : { features: [geocodeFeature('Hollywood', -118.3287, 34.0928)] }
      }
      if (url.pathname.startsWith('/directions/v5/mapbox/walking/')) {
        return { routes: [{ distance: 25_432, duration: 1_860 }] }
      }
    })
    try {
      const result = await runMapboxQuery({ queryType: 'directions', origin: 'LAX', destination: 'Hollywood', mode: 'walking' } as any)
      expect(calls.at(-1)!.pathname).toBe('/directions/v5/mapbox/walking/-118.4085,33.9416;-118.3287,34.0928')
      expect(result.route).toMatchObject({ distanceKm: 25.4, durationMin: 31, profile: 'walking' })
      expect(result.location.place_name).toBe('Hollywood')
    } finally {
      restore()
    }
  })

  it('returns a MAP_QUERY_TRIGGER envelope with an error when Mapbox is not configured', async () => {
    const saved = { a: process.env.MAPBOX_ACCESS_TOKEN, b: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN }
    delete process.env.MAPBOX_ACCESS_TOKEN
    delete process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    try {
      const tool = geospatialTool({ uiStream: { append: () => {}, update: () => {} } as any, mapProvider: 'mapbox' as any })
      const result = await tool.execute({ queryType: 'geocode', location: 'Paris' } as any)
      expect(result.type).toBe('MAP_QUERY_TRIGGER')
      expect(result.mcp_response).toBeNull()
      expect(result.error).toContain('MAPBOX_ACCESS_TOKEN')
    } finally {
      if (saved.a) process.env.MAPBOX_ACCESS_TOKEN = saved.a
      if (saved.b) process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = saved.b
    }
  })
})
