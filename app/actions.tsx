// Type exports preserved for backward compatibility
import type { AIMessage } from '@/lib/types'

export type AIState = {
  messages: AIMessage[]
  chatId: string
  isSharePage?: boolean
}
