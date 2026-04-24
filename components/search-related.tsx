'use client'

import React from 'react'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { useChatContext } from './chat-provider'
import { PartialRelated } from '@/lib/schema/related'

export interface SearchRelatedProps {
  relatedQueries: PartialRelated
}

export const SearchRelated: React.FC<SearchRelatedProps> = ({
  relatedQueries
}) => {
  const { append } = useChatContext()

  const handleRelatedClick = async (query: string) => {
    await append({ role: 'user', content: query })
  }

  return (
    <div className="flex flex-wrap">
      {relatedQueries?.items
        ?.filter(item => item?.query !== '')
        .map((item, index) => (
          <div className="flex items-start w-full animate-in fade-in slide-in-from-bottom-2 duration-300" key={index}>
            <ArrowRight className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-accent-foreground/50" />
            <Button
              variant="link"
              className="flex-1 justify-start px-0 py-1 h-fit font-semibold text-accent-foreground/50 whitespace-normal text-left"
              onClick={() => handleRelatedClick(item?.query || '')}
            >
              {item?.query}
            </Button>
          </div>
        ))}
    </div>
  )
}

export default SearchRelated
