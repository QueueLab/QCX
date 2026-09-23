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
  it('validates schema inputs correctly', () => {
    const validParams = locationEmbeddingsQuerySchema.parse({
      latitude: 34.0454501975,
      longitude: -118.259248828,
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
  })

  it('executes tool call and formats fetch request properly', async () => {
    const mockUiStream = {
      append: () => {},
      update: () => {}
    }

    const originalFetch = globalThis.fetch
    let lastFetchUrl = ''
    let lastFetchOptions: any = null

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      lastFetchUrl = url.toString()
      lastFetchOptions = options
      return new Response(
        JSON.stringify({
          results: [
            { id: 'emb_1', score: 0.95 },
            { id: 'emb_2', score: 0.88 }
          ]
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
        top_k: 10,
        apiKey: 'sk_test_api_key'
      })

      const expectedUrl =
        'https://embeddings.api.lgnd.ai/v1/tenants/ten_01a0cd9a20c671b59c2cf55ee847bc66/collections/col_01a0cd9a20e170daac4573a3f7200000/search-by-location'

      expect(lastFetchUrl).toBe(expectedUrl)
      expect(lastFetchOptions?.headers?.Authorization).toBe('Bearer sk_test_api_key')

      const sentBody = JSON.parse(lastFetchOptions.body)
      expect(sentBody.latitude).toBe(34.0454501975)
      expect(sentBody.longitude).toBe(-118.259248828)
      expect(sentBody.top_k).toBe(10)

      expect(result.results.results.length).toBe(2)
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
        latitude: 34.045,
        longitude: -118.259,
        top_k: 5
      })

      expect(result.error).toContain('HTTP 401')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
