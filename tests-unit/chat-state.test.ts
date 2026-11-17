import { describe, expect, it } from 'bun:test'
import { getMessagesForCompletedTurn, getPreviousAssistantMessage } from '../lib/utils/chat-state'
import type { AIMessage } from '../lib/types'

const userQuestion: AIMessage = {
  id: 'question',
  role: 'user',
  content: JSON.stringify({ input: 'Show me the nearest park' }),
  type: 'input'
}
const inquiry: AIMessage = {
  id: 'inquiry',
  role: 'assistant',
  content: JSON.stringify({ question: 'Which city?' }),
  type: 'inquiry'
}

describe('chat state completion helpers', () => {
  it('allows a new inquiry-only chat to persist its question and inquiry', () => {
    const messages = [userQuestion, inquiry]
    const persistable = getMessagesForCompletedTurn(messages)

    expect(persistable).toEqual([userQuestion, inquiry])
    expect(persistable?.[0].content).toBe(userQuestion.content)
    expect(persistable?.[1].type).toBe('inquiry')
  })

  it('does not persist a turn that has no response or inquiry', () => {
    expect(getMessagesForCompletedTurn([userQuestion])).toBeNull()
  })

  it('retains response-based persistence for completed researcher turns', () => {
    const response: AIMessage = { id: 'response', role: 'assistant', content: 'Done', type: 'response' }
    expect(getMessagesForCompletedTurn([userQuestion, response])).toEqual([userQuestion, response])
  })

  it('looks past the persisted end marker to the preceding assistant inquiry', () => {
    const end: AIMessage = { id: 'end', role: 'assistant', content: 'end', type: 'end' }
    expect(getPreviousAssistantMessage([userQuestion, inquiry, end])).toEqual(inquiry)
  })
})
