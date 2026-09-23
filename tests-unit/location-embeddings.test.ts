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
  it('validates documented inputs and defaults', () => {
    const validParams = locationEmbeddingsQuerySchema.parse({
      latitude: 34.0454501975,
      longitude: -118.259248828,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      top_k: 10
    })

    expect(validParams.latitude).toBe(34.0454501975)
    expect(validParams.longitude).toBe(-118.259248828)
    expect(validParams.top_k).toBe(10)

    const defaultParams = locationEmbeddingsQuerySchema.parse({
      latitude: 0,
      longitude: 0
    })
    expect(defaultParams.top_k).toBe(10)

    expect(() =>
      locationEmbeddingsQuerySchema.parse({ latitude: 100, longitude: 0 })
    ).toThrow()
    expect(() =>
      locationEmbeddingsQuerySchema.parse({ latitude: 0, longitude: 0, top_k: 5001 })
    ).toThrow()
  })

  it('searches by location and resolves chip thumbnail URLs', async () => {
    const mockUiStream = { append: () => {}, update: () => {} }
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.LGND_EMBEDDINGS_API_KEY
    process.env.LGND_EMBEDDINGS_API_KEY = 'sk_test_api_key'
    const requests: Array<{ url: string; options?: RequestInit }> = []

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      requests.push({ url: url.toString(), options })
      if (requests.length === 1) {
        return new Response(
          JSON.stringify({
            data: [
              {
                chip_id: 'chip_1',
                score: 0.95,
                distance: 0.05,
                geometry: { type: 'Point', coordinates: [-118.259, 34.045] },
                datetime: '2024-06-15T10:30:00Z',
                collection: 'naip',
                centroid: { type: 'Point', coordinates: [-118.259, 34.045] }
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
        uiStream: mockUiStream as any,
        fullResponse: ''
      })

      const result = await tool.execute({
        latitude: 34.0454501975,
        longitude: -118.259248828,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        top_k: 10
      })

      expect(requests).toHaveLength(2)
      expect(requests[0].url).toContain('/search-by-location')
      expect(requests[1].url).toContain('/chips/chip_1/thumbnail/url')
      expect(requests[0].options?.headers).toMatchObject({
        Authorization: 'Bearer sk_test_api_key'
      })
      expect(JSON.parse(requests[0].options?.body as string)).toMatchObject({
        latitude: 34.0454501975,
        longitude: -118.259248828,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        top_k: 10
      })
      if (!('results' in result)) throw new Error('Expected a successful result')
      expect(result.results.data).toHaveLength(1)
      expect(result.images).toEqual([
          {
            chip_id: 'chip_1',
            url: 'https://cdn.example.test/chip_1.jpg?signature=temporary',
            expires_at: '2026-09-23T14:00:00Z'
          }
        ])
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey === undefined) delete process.env.LGND_EMBEDDINGS_API_KEY
      else process.env.LGND_EMBEDDINGS_API_KEY = originalApiKey
    }
  })

  it('returns a useful error when the API rejects the request', async () => {
    const mockUiStream = { append: () => {}, update: () => {} }
    const originalFetch = globalThis.fetch
    const originalApiKey = process.env.LGND_EMBEDDINGS_API_KEY
    process.env.LGND_EMBEDDINGS_API_KEY = 'sk_test_api_key'
    globalThis.fetch = (async () =>
      new Response('Unauthorized key', { status: 401 })) as typeof fetch

    try {
      const tool = locationEmbeddingsTool({
        uiStream: mockUiStream as any,
        fullResponse: ''
      })
      const result = await tool.execute({
        latitude: 34.045,
        longitude: -118.259,
        top_k: 5
      })
      if (!('error' in result)) throw new Error('Expected an error result')
      expect(result.error).toContain('HTTP 401')
    } finally {
      globalThis.fetch = originalFetch
      if (originalApiKey === undefined) delete process.env.LGND_EMBEDDINGS_API_KEY
      else process.env.LGND_EMBEDDINGS_API_KEY = originalApiKey
    }
  })
})
