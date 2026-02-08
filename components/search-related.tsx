'use client'

import React from 'react'
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
import { nanoid } from 'nanoid'

export interface SearchRelatedProps {
  relatedQueries: StreamableValue<PartialRelated, any>
}

export const SearchRelated: React.FC<SearchRelatedProps> = ({
  relatedQueries
}) => {
  const { submit } = useActions()
  const [, setMessages] = useUIState<typeof AI>()
  const [data] = useStreamableValue<PartialRelated>(relatedQueries)

  const handleRelatedClick = async (query: string) => {
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
  }

  return (
    <div className="flex flex-wrap">
      {data?.items
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
