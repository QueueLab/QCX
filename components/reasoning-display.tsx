'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReasoningDisplay({
  content
}: {
  content: StreamableValue<string>
}) {
  const [data, error, pending] = useStreamableValue(content)
  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-expand when new data arrives if it was previously empty
  useEffect(() => {
    if (data && data.length > 0 && pending) {
      setIsExpanded(true)
    }
  }, [data, pending])

  if (error) {
    return <div className="text-red-500 text-sm">Error loading reasoning</div>
  }

  const hasContent = data && data.length > 0

  return (
    <div className="my-2 border border-primary/10 rounded-lg overflow-hidden bg-primary/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-primary/70 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>Research Process</span>
          {pending && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 pt-2 border-t border-primary/10">
          {hasContent ? (
            <div className="overflow-x-auto">
              <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50 dark:prose-invert max-w-none">
                {data}
              </MemoizedReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-primary/40 italic">
              {pending ? 'Thinking...' : 'No reasoning available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
