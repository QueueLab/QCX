'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'

export function ReasoningDisplay({
  content
}: {
  content: StreamableValue<string>
}) {
  const [data, error, pending] = useStreamableValue(content)

  if (error) {
    return <div>Error</div>
  }

  if (pending) {
    return null
  }

  return (
    <div className="overflow-x-auto">
      <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50">
        {data || ''}
      </MemoizedReactMarkdown>
    </div>
  )
}
