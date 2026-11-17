import type { AIMessage } from '@/lib/types'

export function getPreviousAssistantMessage(messages: AIMessage[]) {
  return [...messages]
    .reverse()
    .find(message => message.role === 'assistant' && message.type !== 'end')
}

export function getMessagesForCompletedTurn(messages: AIMessage[]): AIMessage[] | null {
  const hasCompletedTurn = messages.some(
    message =>
      message.type === 'response' ||
      (message.role === 'assistant' && message.type === 'inquiry')
  )
  return hasCompletedTurn ? messages : null
}
