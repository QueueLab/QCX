import { describe, expect, it, mock } from 'bun:test'

mock.module('ai/rsc', () => ({
  createStreamableValue: (val: any) => ({
    value: val,
    update: () => {},
    done: () => {}
  }),
  useStreamableValue: (val: any) => [val, null, false],
  createStreamableUI: () => ({ append: () => {}, update: () => {} })
}))

const { locationEmbeddingsQuerySchema } = await import('../lib/schema/location-embeddings')
const { locationEmbeddingsTool } = await import('../lib/agents/tools/location-embeddings')

describe('Natural-language location embeddings tool', () => {
  it('validates natural-language queries and optional place names', () => {
    const validParams = locationEmbeddingsQuerySchema.parse({
      query: 'heavy machinery used to fell timber near forests',
      location: 'Oregon',
      top_k: 10
    })

    expect(validParams.query).toContain('heavy machinery')
    expect(validParams.location).toBe('Oregon')
    expect(validParams.top_k).toBe(10)

    expect(() => locationEmbeddingsQuerySchema.parse({ query: '' })).toThrow()
    expect(() =>
      locationEmbeddingsQuerySchema.parse({ query: 'forests', top_k: 5001 })
    ).toThrow()
  })

  it('geocodes a place, searches LGND by text within its region, and resolves thumbnails', async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.LGND_EMBEDDINGS_API_KEY
    const originalMapboxToken = process.env.MAPBOX_ACCESS_TOKEN
    process.env.LGND_EMBEDDINGS_API_KEY = 'sk_test_api_key'
    process.env.MAPBOX_ACCESS_TOKEN = 'pk_test_mapbox_token'
    const requests: Array<{ url: string; options?: RequestInit }> = []

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      requests.push({ url: url.toString(), options })
      if (requests.length === 1) {
        return new Response(
          JSON.stringify({
            features: [
              {
                place_name: 'Oregon, United States',
                center: [-120.5542, 43.8041],
                bbox: [-124.7035, 41.9918, -116.4635, 46.292]
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (requests.length === 2) {
        return new Response(
          JSON.stringify({
            data: [
              {
                chip_id: 'chip_1',
                score: 0.95,
                distance: 0.05,
                geometry: { type: 'Polygon', coordinates: [] },
                datetime: '2024-06-15T10:30:00Z',
                collection: 'naip',
                centroid: { type: 'Point', coordinates: [-120.55, 43.8] }
              }
            ],
            _meta: { top_k: 10 }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({
          object: 'thumbnail_url',
          url: 'https://cdn.example.test/chip_1.jpg?signature=temporary',
          expires_at: '2026-09-23T14:00:00Z'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: { append: () => {}, update: () => {} } as any,
        fullResponse: ''
      })
      const result = await tool.execute({
        query: 'heavy machinery used to fell timber near forests',
        location: 'Oregon',
        top_k: 10
      })

      expect(requests).toHaveLength(3)
      expect(requests[0].url).toContain('api.mapbox.com/geocoding')
      expect(requests[1].url).toContain('/search-by-text')
      expect(requests[2].url).toContain('/chips/chip_1/thumbnail/url')
      expect(JSON.parse(requests[1].options?.body as string)).toMatchObject({
        query: 'heavy machinery used to fell timber near forests',
        top_k: 10,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-124.7035, 41.9918],
            [-116.4635, 41.9918],
            [-116.4635, 46.292],
            [-124.7035, 46.292],
            [-124.7035, 41.9918]
          ]]
        }
      })
      expect(requests[1].options?.headers).toMatchObject({
        Authorization: 'Bearer sk_test_api_key'
      })
      if (!('results' in result)) throw new Error('Expected a successful result')
      expect(result.location).toBe('Oregon, United States')
      expect(result.results.data).toHaveLength(1)
      expect(result.images[0].url).toContain('chip_1.jpg')
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey === undefined) delete process.env.LGND_EMBEDDINGS_API_KEY
      else process.env.LGND_EMBEDDINGS_API_KEY = originalApiKey
      if (originalMapboxToken === undefined) delete process.env.MAPBOX_ACCESS_TOKEN
      else process.env.MAPBOX_ACCESS_TOKEN = originalMapboxToken
    }
  })

  it('supports explicit coordinates without calling Mapbox', async () => {
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.LGND_EMBEDDINGS_API_KEY
    process.env.LGND_EMBEDDINGS_API_KEY = 'sk_test_api_key'
    let requestCount = 0
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      requestCount += 1
      expect(url.toString()).toContain('/search-by-text')
      expect(JSON.parse(options?.body as string)).toMatchObject({
        query: 'clear-cut forest',
        top_k: 5
      })
      return new Response(JSON.stringify({ data: [] }), { status: 200 })
    }) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: { append: () => {}, update: () => {} } as any,
        fullResponse: ''
      })
      const result = await tool.execute({
        query: 'clear-cut forest',
        latitude: 43.8041,
        longitude: -120.5542,
        top_k: 5
      })
      expect(requestCount).toBe(1)
      if (!('results' in result)) throw new Error('Expected a successful result')
      expect(result.latitude).toBe(43.8041)
      expect(result.longitude).toBe(-120.5542)
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey === undefined) delete process.env.LGND_EMBEDDINGS_API_KEY
      else process.env.LGND_EMBEDDINGS_API_KEY = originalApiKey
    }
  })
})
