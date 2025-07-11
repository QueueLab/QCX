'use client'

import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import {
  useActions,
  useStreamableValue,
  useUIState,
  readStreamableValue,
  StreamableValue
} from 'ai/rsc'
import { AI } from '@/app/actions'
// Removed import of useGeospatialToolMcp as it's no longer used/available
import { UserMessage } from './user-message'
import { PartialRelated } from '@/lib/schema/related'

export interface SearchRelatedProps {
  relatedQueries: StreamableValue<PartialRelated, any>
}

export const SearchRelated: React.FC<SearchRelatedProps> = ({
  relatedQueries
}) => {
  const { submit } = useActions()
  // Removed mcp instance as it's no longer passed to submit
  const [, setMessages] = useUIState<typeof AI>()
  const [data, error, pending] =
    useStreamableValue<PartialRelated>(relatedQueries)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget as HTMLFormElement)

    // // Get the submitter of the form
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLInputElement
    let query = ''
    if (submitter) {
      formData.append(submitter.name, submitter.value)
      query = submitter.value
    }

    const userMessage = {
      id: Date.now(),
      component: <UserMessage message={query} />
    }

    // Removed mcp argument from submit call
    const responseMessage = await submit(formData)
    setMessages(currentMessages => [
      ...currentMessages,
      userMessage,
      responseMessage
    ])
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap">
      {data?.items
        ?.filter(item => item?.query !== '')
        .map((item, index) => (
          <div className="flex items-start w-full" key={index}>
            <ArrowRight className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-accent-foreground/50" />
            <Button
              variant="link"
              className="flex-1 justify-start px-0 py-1 h-fit font-semibold text-accent-foreground/50 whitespace-normal text-left"
              type="submit"
              name={'related_query'}
              value={item?.query}
            >
              {item?.query}
            </Button>
          </div>
        ))}
    </form>
  )
}

export default SearchRelated
