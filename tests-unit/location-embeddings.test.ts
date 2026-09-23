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

  it('executes tool call, queries thumbnails for chips, and formats fetch request properly', async () => {
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
            results: [
              { chip_id: 'chip_123', score: 0.95 },
              { chip_id: 'chip_456', score: 0.88 }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (urlStr.includes('/chips/chip_123/thumbnail/url')) {
        return new Response(
          JSON.stringify({ url: 'https://cdn.embeddings.api.lgnd.ai/thumb1.png' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (urlStr.includes('/chips/chip_456/thumbnail/url')) {
        return new Response(
          JSON.stringify({ url: 'https://cdn.embeddings.api.lgnd.ai/thumb2.png' }),
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

      const expectedSearchUrl =
        'https://embeddings.api.lgnd.ai/v1/tenants/ten_01a0cd9a20c671b59c2cf55ee847bc66/collections/col_01a0cd9a20e170daac4573a3f7200000/search-by-location'

      expect(fetchCalls[0].url).toBe(expectedSearchUrl)
      expect(fetchCalls[0].options?.headers?.Authorization).toBe('Bearer sk_test_api_key')

      const sentBody = JSON.parse(fetchCalls[0].options.body)
      expect(sentBody.latitude).toBe(34.0454501975)
      expect(sentBody.longitude).toBe(-118.259248828)
      expect(sentBody.top_k).toBe(10)

      // Verify chip thumbnail URLs were requested
      const thumbUrls = fetchCalls.slice(1).map(c => c.url)
      expect(thumbUrls).toContain('https://embeddings.api.lgnd.ai/v1/chips/chip_123/thumbnail/url')
      expect(thumbUrls).toContain('https://embeddings.api.lgnd.ai/v1/chips/chip_456/thumbnail/url')

      // Verify collected images in output payload
      expect(result.images).toEqual([
        'https://cdn.embeddings.api.lgnd.ai/thumb1.png',
        'https://cdn.embeddings.api.lgnd.ai/thumb2.png'
      ])
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
