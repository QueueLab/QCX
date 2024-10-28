import { submit } from './actions'
import { getMutableAIState, createStreamableUI, createStreamableValue } from 'ai/rsc'
import { nanoid } from 'ai'
import { CoreMessage } from 'ai'
import { inquire, researcher, taskManager, querySuggestor } from '@/lib/agents'
import { writer } from '@/lib/agents/writer'

jest.mock('ai/rsc', () => ({
  getMutableAIState: jest.fn(),
  createStreamableUI: jest.fn(),
  createStreamableValue: jest.fn()
}))

jest.mock('ai', () => ({
  nanoid: jest.fn(),
  CoreMessage: jest.fn()
}))

jest.mock('@/lib/agents', () => ({
  inquire: jest.fn(),
  researcher: jest.fn(),
  taskManager: jest.fn(),
  querySuggestor: jest.fn()
}))

jest.mock('@/lib/agents/writer', () => ({
  writer: jest.fn()
}))

describe('submit', () => {
  let aiState
  let uiStream
  let isGenerating
  let isCollapsed

  beforeEach(() => {
    aiState = {
      get: jest.fn(),
      update: jest.fn(),
      done: jest.fn()
    }
    uiStream = {
      update: jest.fn(),
      append: jest.fn(),
      done: jest.fn()
    }
    isGenerating = {
      value: true,
      done: jest.fn()
    }
    isCollapsed = {
      value: false,
      done: jest.fn()
    }

    getMutableAIState.mockReturnValue(aiState)
    createStreamableUI.mockReturnValue(uiStream)
    createStreamableValue.mockImplementation(value => ({
      value,
      done: jest.fn()
    }))
    nanoid.mockReturnValue('test-id')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should handle user input', async () => {
    const formData = new FormData()
    formData.append('input', 'test input')

    await submit(formData)

    expect(aiState.update).toHaveBeenCalledWith({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: 'test-id',
          role: 'user',
          content: '{"input":"test input"}',
          type: 'input'
        }
      ]
    })
  })

  it('should handle skip action', async () => {
    await submit(undefined, true)

    expect(aiState.update).toHaveBeenCalledWith({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: 'test-id',
          role: 'user',
          content: '{"action": "skip"}',
          type: undefined
        }
      ]
    })
  })

  it('should process events', async () => {
    taskManager.mockResolvedValue({ object: { next: 'proceed' } })
    researcher.mockResolvedValue({
      fullResponse: 'test response',
      hasError: false,
      toolResponses: []
    })
    querySuggestor.mockResolvedValue([])

    await submit()

    expect(taskManager).toHaveBeenCalled()
    expect(researcher).toHaveBeenCalled()
    expect(querySuggestor).toHaveBeenCalled()
  })
})
