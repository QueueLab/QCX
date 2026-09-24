import { describe, expect, it, mock } from 'bun:test'

mock.module('ai/rsc', () => ({
  createStreamableValue: (val: any) => ({
    value: val,
    update: () => {},
    done: () => {}
  }),
  useStreamableValue: (val: any) => [val, null, false],
  createStreamableUI: () => ({
    append: () => {},
    update: () => {}
  })
}))

const { locationEmbeddingsQuerySchema } = await import(
  '../lib/schema/location-embeddings'
)
const { locationEmbeddingsTool } = await import(
  '../lib/agents/tools/location-embeddings'
)

describe('Location Embeddings Tool', () => {
  it('validates schema inputs correctly with natural language queries', () => {
    const validTextParams = locationEmbeddingsQuerySchema.parse({
      query:
        'heavy machinery used to fell timber near forests that have not previously been cleared',
      location: 'Oregon',
      top_k: 10
    })

    expect(validTextParams.query).toContain('heavy machinery')
    expect(validTextParams.location).toBe('Oregon')
    expect(validTextParams.top_k).toBe(10)

    const validCoordParams = locationEmbeddingsQuerySchema.parse({
      latitude: 34.0454501975,
      longitude: -118.259248828,
      top_k: 5
    })

    expect(validCoordParams.latitude).toBe(34.0454501975)
    expect(validCoordParams.longitude).toBe(-118.259248828)
    expect(validCoordParams.top_k).toBe(5)

    expect(() =>
      locationEmbeddingsQuerySchema.parse({ latitude: 100, longitude: 0 })
    ).toThrow()
  })

  it('executes text search query with Mapbox geocoding and search-by-text endpoint', async () => {
    const mockUiStream = {
      append: () => {},
      update: () => {}
    }

    const originalFetch = globalThis.fetch
    const fetchCalls: Array<{ url: string; options: any }> = []

    process.env.MAPBOX_ACCESS_TOKEN = 'pk.test_mapbox_token'

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = url.toString()
      fetchCalls.push({ url: urlStr, options })

      if (urlStr.includes('api.mapbox.com/geocoding')) {
        return new Response(
          JSON.stringify({
            features: [
              {
                center: [-120.5542, 43.8041],
                bbox: [-124.5662, 41.9918, -116.4635, 46.292]
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (urlStr.includes('/search-by-text')) {
        return new Response(
          JSON.stringify({
            results: [{ chip_id: 'chip_oregon_1', score: 0.92 }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (urlStr.includes('/chips/chip_oregon_1/thumbnail/url')) {
        return new Response(
          JSON.stringify({ url: 'https://cdn.embeddings.api.lgnd.ai/oregon_thumb.png' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response('Not found', { status: 404 })
    }) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: mockUiStream as any,
        fullResponse: ''
      })

      const result = await tool.execute({
        query:
          'heavy machinery used to fell timber near forests that have not previously been cleared',
        location: 'Oregon',
        top_k: 10,
        apiKey: 'sk_test_api_key'
      })

      // Check mapbox geocoding call
      expect(fetchCalls[0].url).toContain('api.mapbox.com/geocoding/v5/mapbox.places/Oregon.json')

      // Check search-by-text call
      const searchCall = fetchCalls.find(c => c.url.includes('/search-by-text'))
      expect(searchCall).toBeDefined()
      expect(searchCall?.options?.headers?.Authorization).toBe('Bearer sk_test_api_key')

      const sentBody = JSON.parse(searchCall?.options.body)
      expect(sentBody.query).toContain('heavy machinery')
      expect(sentBody.geometry.type).toBe('Polygon')

      // Check thumbnail url fetch and images result
      expect(result.images).toEqual(['https://cdn.embeddings.api.lgnd.ai/oregon_thumb.png'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('executes coordinate-based search-by-location query', async () => {
    const mockUiStream = {
      append: () => {},
      update: () => {}
    }

    const originalFetch = globalThis.fetch
    const fetchCalls: Array<{ url: string; options: any }> = []

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = url.toString()
      fetchCalls.push({ url: urlStr, options })

      if (urlStr.includes('/search-by-location')) {
        return new Response(
          JSON.stringify({
            results: [{ chip_id: 'chip_123', score: 0.95 }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (urlStr.includes('/chips/chip_123/thumbnail/url')) {
        return new Response(
          JSON.stringify({ url: 'https://cdn.embeddings.api.lgnd.ai/thumb1.png' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response('Not found', { status: 404 })
    }) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: mockUiStream as any,
        fullResponse: ''
      })

      const result = await tool.execute({
        latitude: 34.0454501975,
        longitude: -118.259248828,
        top_k: 10,
        apiKey: 'sk_test_api_key'
      })

      expect(fetchCalls[0].url).toContain('/search-by-location')
      const sentBody = JSON.parse(fetchCalls[0].options.body)
      expect(sentBody.latitude).toBe(34.0454501975)
      expect(sentBody.longitude).toBe(-118.259248828)
      expect(result.images).toEqual(['https://cdn.embeddings.api.lgnd.ai/thumb1.png'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('handles API HTTP errors gracefully', async () => {
    const mockUiStream = {
      append: () => {},
      update: () => {}
    }

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      return new Response('Unauthorized key', { status: 401 })
    }) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: mockUiStream as any,
        fullResponse: ''
      })

      const result = await tool.execute({
        query: 'construction sites',
        location: 'Phoenix, Arizona',
        top_k: 5
      })

      expect(result.error).toContain('HTTP 401')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('retries search-by-text without geometry when Embeddings API returns 422 geometry bounds error', async () => {
    const mockUiStream = {
      append: () => {},
      update: () => {}
    }

    const originalFetch = globalThis.fetch
    const fetchCalls: Array<{ url: string; options: any }> = []

    process.env.MAPBOX_ACCESS_TOKEN = 'pk.test_mapbox_token'

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      const urlStr = url.toString()
      fetchCalls.push({ url: urlStr, options })

      if (urlStr.includes('api.mapbox.com/geocoding')) {
        return new Response(
          JSON.stringify({
            features: [
              {
                center: [-120.5542, 43.8041],
                bbox: [-124.5662, 41.9918, -116.4635, 46.292]
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (urlStr.includes('/search-by-text')) {
        const body = JSON.parse(options?.body as string)
        if (body.geometry) {
          return new Response(
            JSON.stringify({
              error: {
                type: 'invalid_request_error',
                code: 'VALIDATION_ERROR',
                message: 'Search geometry does not intersect collection bounds.',
                param: 'geometry'
              }
            }),
            { status: 422, headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({
            results: [{ chip_id: 'chip_fallback_1', score: 0.88 }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (urlStr.includes('/chips/chip_fallback_1/thumbnail/url')) {
        return new Response(
          JSON.stringify({ url: 'https://cdn.embeddings.api.lgnd.ai/fallback_thumb.png' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response('Not found', { status: 404 })
    }) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: mockUiStream as any,
        fullResponse: ''
      })

      const result = await tool.execute({
        query: 'heavy machinery used to fell timber',
        location: 'Oregon',
        top_k: 10
      })

      const textSearchCalls = fetchCalls.filter(c => c.url.includes('/search-by-text'))
      expect(textSearchCalls.length).toBe(2)

      // First request had geometry
      const firstBody = JSON.parse(textSearchCalls[0].options.body)
      expect(firstBody.geometry).toBeDefined()

      // Fallback request did NOT have geometry
      const fallbackBody = JSON.parse(textSearchCalls[1].options.body)
      expect(fallbackBody.geometry).toBeUndefined()
      expect(fallbackBody.query).toBe('heavy machinery used to fell timber')

      // Result succeeded with images from fallback
      expect(result.error).toBeUndefined()
      expect(result.images).toEqual(['https://cdn.embeddings.api.lgnd.ai/fallback_thumb.png'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('returns explicit error when search-by-location is called without valid coordinates', async () => {
    const mockUiStream = {
      append: () => {},
      update: () => {}
    }

    const tool = locationEmbeddingsTool({
      uiStream: mockUiStream as any,
      fullResponse: ''
    })

    const result = await tool.execute({
      top_k: 5
    })

    expect(result.error).toBe('Location search requires valid latitude and longitude coordinates.')
  })

  it('returns human-friendly error message when search-by-location returns 422 bounds error', async () => {
    const mockUiStream = {
      append: () => {},
      update: () => {}
    }

    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Search geometry does not intersect collection bounds.'
          }
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      )
    }) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: mockUiStream as any,
        fullResponse: ''
      })

      const result = await tool.execute({
        latitude: 45.5152,
        longitude: -122.6784,
        top_k: 5
      })

      expect(result.error).toContain('outside the selected LGND collection bounds')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
