'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'

export function ReasoningDisplay({
  content,
  actions
}: {
  content: StreamableValue<string>
  actions: StreamableValue<string>
}) {
  const [data, error, pending] = useStreamableValue(content)
  const [actionsData] = useStreamableValue(actions)

  if (error) {
    return <div>Error</div>
  }

  return (
    <div className="overflow-x-auto">
      <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50">
        {data || ''}
      </MemoizedReactMarkdown>
      {actionsData && (
        <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50">
          {actionsData}
        </MemoizedReactMarkdown>
      )}
    </div>
  )
}
