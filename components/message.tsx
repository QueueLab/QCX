'use client'

import { StreamableValue } from 'ai/rsc'
import { StreamingMarkdown } from './ui/StreamingMarkdown'

export function BotMessage({ content }: { content: StreamableValue<string> }) {
  return <StreamingMarkdown content={content} />
}
