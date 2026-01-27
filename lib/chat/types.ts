import { StreamableValue } from 'ai/rsc'
import { AIMessage } from '@/lib/types'

export type AIState = {
  chatId: string
  messages: AIMessage[]
  isSharePage?: boolean
}

export type UIState = {
  id: string
  threadId?: string
  component: React.ReactNode
  isGenerating?: StreamableValue<boolean>
  isCollapsed?: StreamableValue<boolean>
}[]
