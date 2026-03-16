'use client'

import { useMemo } from 'react'
import { StreamableValue, useUIState } from 'ai/rsc'
import type { AI, UIState } from '@/app/actions'
import { CollapsibleMessage } from './collapsible-message'

interface ChatMessagesProps {
  messages: UIState
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  // ⚡ Bolt: Memoize the grouped messages to avoid expensive array reductions
  // and object mapping on every render as the chat history grows.
  const groupedMessagesArray = useMemo(() => {
    if (!messages.length) {
      return []
    }

    // Group messages based on ID, and if there are multiple messages with the same ID, combine them into one message
    const groupedMessages = messages.reduce(
      (acc: { [key: string]: any }, message) => {
        if (!acc[message.id]) {
          acc[message.id] = {
            id: message.id,
            components: [],
            isCollapsed: message.isCollapsed
          }
        }
        acc[message.id].components.push(message.component)
        return acc
      },
      {}
    )

    // Convert grouped messages into an array with explicit type
    return Object.values(groupedMessages).map(group => ({
      ...group,
      components: group.components as React.ReactNode[]
    })) as {
      id: string
      components: React.ReactNode[]
      isCollapsed?: StreamableValue<boolean>
    }[]
  }, [messages])

  if (!messages.length) {
    return null
  }

  return (
    <>
      {groupedMessagesArray.map(
        (
          groupedMessage: {
            id: string
            components: React.ReactNode[]
            isCollapsed?: StreamableValue<boolean>
          },
          index
        ) => (
          <CollapsibleMessage
            key={`${groupedMessage.id}`}
            message={{
              id: groupedMessage.id,
              component: groupedMessage.components.map((component, i) => (
                <div key={`${groupedMessage.id}-${i}`}>{component}</div>
              )),
              isCollapsed: groupedMessage.isCollapsed
            }}
            isLastMessage={
              groupedMessage.id === messages[messages.length - 1].id
            }
          />
        )
      )}
    </>
  )
}
