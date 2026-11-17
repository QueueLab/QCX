import { describe, expect, it, mock } from 'bun:test'

let generateObjectImpl: (...args: any[]) => Promise<any> = async () => ({ object: { next: 'proceed' } })
let streamObjectImpl: (...args: any[]) => Promise<any> = async () => ({
  partialObjectStream: (async function* () { yield { question: 'Which city?', options: [] } })()
})

mock.module('ai', () => ({
  generateObject: (...args: any[]) => generateObjectImpl(...args),
  streamObject: (...args: any[]) => streamObjectImpl(...args)
}))
mock.module('ai/rsc', () => ({
  createStreamableUI: () => ({ update: () => {}, append: () => {}, done: () => {} }),
  createStreamableValue: (value: any) => ({ value, update: () => {}, done: () => {} })
}))
mock.module('../lib/utils', () => ({ getModel: async () => ({}) }))
mock.module('@/components/copilot', () => ({ Copilot: () => null }))

const { taskManager } = await import('../lib/agents/task-manager')
const { inquire } = await import('../lib/agents/inquire')

describe('clarification agents', () => {
  it('bypasses task classification when the latest user message contains an image', async () => {
    let calls = 0
    generateObjectImpl = async () => { calls++; return { object: { next: 'inquire' } } }

    const result = await taskManager([
      { role: 'user', content: [{ type: 'text', text: 'What is this?' }, { type: 'image', image: new Uint8Array([1]) }] } as any
    ])

    expect(result?.object.next).toBe('proceed')
    expect(calls).toBe(0)
  })

  it('returns null when task classification fails', async () => {
    generateObjectImpl = async () => { throw new Error('model unavailable') }
    expect(await taskManager([{ role: 'user', content: 'Find something nearby' }])).toBeNull()
  })

  it('returns the completed inquiry object', async () => {
    const inquiry = { question: 'Which city?', options: [{ label: 'Paris', value: 'Paris' }] }
    streamObjectImpl = async () => ({
      partialObjectStream: (async function* () { yield inquiry })()
    })
    const uiStream = { update: () => {}, append: () => {}, done: () => {} }
    const result = await inquire(uiStream as any, [{ role: 'user', content: 'Find a cafe' }])
    expect(result).toEqual(inquiry)
  })
})
