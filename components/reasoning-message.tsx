'use client'

import { StreamableValue } from 'ai/rsc'
import { BotMessage } from './message'

export function ReasoningMessage({
  content
}: {
  content: StreamableValue<string>
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <p className="text-sm font-semibold mb-2">Reasoning:</p>
      <BotMessage content={content} />
    </div>
  )
}
