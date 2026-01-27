import { createAI } from 'ai/rsc'
import { nanoid } from 'nanoid'
import { submit, clearChat, onGetUIState, onSetAIState } from './chat-actions'
import { AIState, UIState } from '@/lib/chat/types'

export type { AIState, UIState }

const initialAIState: AIState = {
  chatId: nanoid(),
  messages: []
}

const initialUIState: UIState = []

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
    clearChat
  },
  initialUIState,
  initialAIState,
  onGetUIState,
  onSetAIState
})
