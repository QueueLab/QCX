'use client'

import { BotMessage } from './message'

export function ReasoningMessage({ content }: { content: string }) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <p className="text-sm font-semibold mb-2">Reasoning:</p>
      <BotMessage content={content} />
    </div>
  )
}
