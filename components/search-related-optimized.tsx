'use client'

import React, { useCallback, useMemo } from 'react'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import {
  useActions,
  useStreamableValue,
  useUIState,
  StreamableValue
} from 'ai/rsc'
import { AI } from '@/app/actions'
import { UserMessage } from './user-message'
import { PartialRelated } from '@/lib/schema/related'
import { nanoid } from '@/lib/utils'

export interface SearchRelatedProps {
  relatedQueries: StreamableValue<PartialRelated, any>
}

/**
 * OPTIMIZATION: Memoized SearchRelated component with optimized handlers
 * Prevents unnecessary re-renders and reduces event handler allocations
 */
export const SearchRelated: React.FC<SearchRelatedProps> = React.memo(({
  relatedQueries
}) => {
  const { submit } = useActions()
  const [, setMessages] = useUIState<typeof AI>()
  const [data] = useStreamableValue<PartialRelated>(relatedQueries)

  // OPTIMIZATION: Memoize click handler with useCallback
  const handleRelatedClick = useCallback(async (query: string) => {
    const formData = new FormData()
    formData.append('related_query', query)

    const userMessage = {
      id: nanoid(),
      component: <UserMessage content={query} />
    }

    const responseMessage = await submit(formData)
    setMessages(currentMessages => [
      ...currentMessages,
      userMessage,
      responseMessage
    ])
  }, [submit, setMessages])

  // OPTIMIZATION: Memoize filtered and mapped items
  const relatedItems = useMemo(() => {
    return data?.items
      ?.filter(query => query !== '')
      .map((query, index) => (
        <div 
          key={`related-${index}`}
          className="flex items-start w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <ArrowRight className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-accent-foreground/50" />
          <Button
            variant="link"
            className="flex-1 justify-start px-0 py-1 h-fit font-semibold text-accent-foreground/50 whitespace-normal text-left"
            onClick={() => handleRelatedClick(query || '')}
          >
            {query}
          </Button>
        </div>
      )) || []
  }, [data?.items, handleRelatedClick])

  return (
    <div className="flex flex-wrap">
      {relatedItems}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if the streamable value reference changes
  return prevProps.relatedQueries === nextProps.relatedQueries
})

SearchRelated.displayName = 'SearchRelated'

export default SearchRelated
