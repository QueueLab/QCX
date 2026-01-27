'use client'

import { StreamableValue, useUIState, useStreamableValue } from 'ai/rsc'
import type { AI, UIState } from '@/app/ai'
import { CollapsibleMessage } from './collapsible-message'
import { Spinner } from './ui/spinner'

interface ChatMessagesProps {
  messages: UIState
}

function MessageSpinner({ isGenerating }: { isGenerating: StreamableValue<boolean> }) {
  const [generating] = useStreamableValue(isGenerating)
  if (!generating) return null
  return (
    <div className="flex justify-start px-4 py-2">
      <Spinner />
    </div>
  )
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  if (!messages.length) {
    return null
  }

  // Group messages based on ID, and if there are multiple messages with the same ID, combine them into one message
  const groupedMessages = messages.reduce(
    (acc: { [key: string]: any }, message) => {
      if (!acc[message.id]) {
        acc[message.id] = {
          id: message.id,
          components: [],
          isCollapsed: message.isCollapsed,
          isGenerating: message.isGenerating
        }
      }
      acc[message.id].components.push(message.component)
      return acc
    },
    {}
  )

  // Convert grouped messages into an array with explicit type
  const groupedMessagesArray = Object.values(groupedMessages).map(group => ({
    ...group,
    components: group.components as React.ReactNode[]
  })) as {
    id: string
    components: React.ReactNode[]
    isCollapsed?: StreamableValue<boolean>
    isGenerating?: StreamableValue<boolean>
  }[]

  return (
    <div className="flex flex-col gap-4">
      {groupedMessagesArray.map(
        (
          groupedMessage,
          index
        ) => (
          <div key={`${groupedMessage.id}`}>
            <CollapsibleMessage
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
            {groupedMessage.isGenerating && (
              <MessageSpinner isGenerating={groupedMessage.isGenerating} />
            )}
          </div>
        )
      )}
    </div>
  )
}
