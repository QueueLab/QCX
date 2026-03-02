'use client'

import { memo, useMemo } from 'react'
import { StreamableValue } from 'ai/rsc'
import type { UIState } from '@/app/actions'
import { CollapsibleMessage } from './collapsible-message'

interface ChatMessagesProps {
  messages: UIState
}

export const ChatMessages = memo(({ messages }: ChatMessagesProps) => {
  // Group messages based on ID, and if there are multiple messages with the same ID, combine them into one message
  const groupedMessagesArray = useMemo(() => {
    if (!messages.length) {
      return []
    }

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
      components: (group as any).components as React.ReactNode[]
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
          }
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
})

ChatMessages.displayName = 'ChatMessages'
