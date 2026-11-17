import { describe, expect, it, mock } from 'bun:test'

let streamEvents: any[] = []
let systemPrompt = ''
let selectedModel: string | null = 'test-model'
let getToolsCalls = 0
const liveStreams: Array<{ value: string; update: (value: string) => void; done: (value?: string) => void }> = []
const uiStreams: Array<{ appended: any[]; update: (value: any) => void; append: (value: any) => void }> = []

mock.module('ai', () => ({
  streamText: async (options: any) => {
    systemPrompt = options.system
    return { fullStream: (async function* () { yield* streamEvents })() }
  }
}))
mock.module('ai/rsc', () => ({
  createStreamableValue: (value: string) => {
    const stream = {
      value,
      update(next: string) { stream.value = next },
      done(next?: string) { if (next !== undefined) stream.value = next }
    }
    liveStreams.push(stream)
    return stream
  },
  createStreamableUI: () => {
    const stream = { appended: [] as any[], update: (_value: any) => {}, append(value: any) { stream.appended.push(value) } }
    uiStreams.push(stream)
    return stream
  }
}))
mock.module('../lib/utils', () => ({ getModel: async () => ({}) }))
mock.module('../lib/actions/users', () => ({ getSelectedModel: async () => selectedModel }))
mock.module('../lib/agents/tools', () => ({ getTools: () => { getToolsCalls++; return {} } }))
mock.module('../lib/utils/with-timeout', () => ({ AI_REQUEST_TIMEOUT_MS: 1000, createDeadlineSignal: () => undefined }))
mock.module('@/components/section', () => ({ Section: () => null }))
mock.module('@/components/message', () => ({ BotMessage: () => null }))
mock.module('@/components/map/map-query-handler', () => ({ MapQueryHandler: () => null }))
mock.module('@/components/resolution-image', () => ({ ResolutionImage: () => null }))

const { researcher } = await import('../lib/agents/researcher')

async function run(events: any[], prompt = '') {
  streamEvents = events
  const uiStream = { appended: [] as any[], update: (_value: any) => {}, append(value: any) { uiStream.appended.push(value) } }
  const streamText = {
    value: '',
    update(value: string) { this.value = value },
    done(value?: string) { if (value !== undefined) this.value = value }
  }
  const messages: any[] = [{ role: 'user', content: 'coffee shops near a landmark' }]
  const result = await researcher(prompt, uiStream as any, streamText as any, messages, 'mapbox' as any)
  return { result, streamText, uiStream, messages }
}

describe('researcher outcome rendering', () => {
  it('streams text into a mounted response section', async () => {
    const { result, streamText, uiStream } = await run([{ type: 'text-delta', textDelta: 'Found three cafes.' }])
    expect(result.fullResponse).toBe('Found three cafes.')
    expect(streamText.value).toBe('Found three cafes.')
    expect(uiStream.appended).toHaveLength(1)
    expect(systemPrompt).toContain('does not remove the final answer')
    expect(systemPrompt).toContain('state the location result concisely')
    expect(result.hasError).toBe(false)
  })

  it('builds a location fallback when geospatial results have no model text', async () => {
    const geospatial = {
      type: 'MAP_QUERY_TRIGGER', error: null,
      mcp_response: { location: { place_name: 'Cafe de Flore', address: '172 Boulevard Saint-Germain', latitude: 48.854, longitude: 2.333 }, mapUrl: 'https://maps.example/cafe' }
    }
    const { result, uiStream } = await run([{ type: 'tool-result', toolName: 'geospatialQueryTool', result: geospatial }])
    expect(uiStream.appended).toHaveLength(2) // live map handler and answer section
    expect(result.fullResponse).toContain('Cafe de Flore')
    expect(result.fullResponse).toContain('172 Boulevard Saint-Germain')
    expect(result.fullResponse).toContain('Latitude: 48.854')
    expect(result.fullResponse).toContain('Longitude: 2.333')
    expect(result.fullResponse).toContain('https://maps.example/cafe')
  })

  it('marks geospatial error envelopes as errors and makes their message visible', async () => {
    const { result, streamText } = await run([{
      type: 'tool-result', toolName: 'geospatialQueryTool',
      result: { type: 'MAP_QUERY_TRIGGER', error: 'Mapping service unavailable', mcp_response: null }
    }])
    expect(result.hasError).toBe(true)
    expect(result.fullResponse).toContain('Mapping service unavailable')
    expect(streamText.value).toContain('Mapping service unavailable')
  })

  it('mounts a response section when the stream emits an error delta', async () => {
    const { result, uiStream, streamText } = await run([{ type: 'error', error: new Error('generation failed') }])
    expect(result.hasError).toBe(true)
    expect(result.fullResponse).toContain('Error: Model response generation failed.')
    expect(streamText.value).toContain('Error: Model response generation failed.')
    expect(uiStream.appended).toHaveLength(1)
  })

  it('renders a no-response fallback for an empty stream', async () => {
    const { result, uiStream } = await run([])
    expect(result.fullResponse).toBe('No response was generated. Please try again.')
    expect(uiStream.appended).toHaveLength(1)
  })
})
