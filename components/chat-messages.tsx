'use client'

import type { Message } from 'ai/react'
import { CollapsibleMessage } from './collapsible-message'
import { Section } from './section'
import { BotMessage } from './message'
import { UserMessage } from './user-message'
import { ToolResultRenderer } from './tool-result-renderer'
import { useChatContext, type Annotation } from './chat-provider'
import { Copilot } from './copilot'
import SearchRelated from './search-related'

interface ChatMessagesProps {
  messages: Message[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const { annotations, isLoading } = useChatContext()

  if (!messages.length && !annotations.length) {
    return null
  }

  const renderedMessages: {
    id: string
    component: React.ReactNode
    isCollapsed?: boolean
    isAssistant?: boolean
  }[] = []

  // Render tool result annotations first (they come before the text)
  const toolAnnotations = annotations.filter((a: Annotation) => a.type === 'tool_result')
  for (let i = 0; i < toolAnnotations.length; i++) {
    const ann = toolAnnotations[i]
    renderedMessages.push({
      id: `tool-${ann.toolName}-${i}`,
      component: <ToolResultRenderer toolName={ann.toolName} result={ann.result} />,
      isCollapsed: true
    })
  }

  // Render chat messages
  for (const message of messages) {
    if (message.role === 'user') {
      renderedMessages.push({
        id: message.id,
        component: <UserMessage content={message.content} />
      })
    } else if (message.role === 'assistant') {
      if (message.content) {
        renderedMessages.push({
          id: message.id,
          component: (
            <Section title="response">
              <BotMessage content={message.content} />
            </Section>
          ),
          isAssistant: true
        })
      }

      // Render tool invocations
      if (message.toolInvocations) {
        for (const invocation of message.toolInvocations) {
          if (invocation.state === 'result') {
            renderedMessages.push({
              id: `${message.id}-tool-${invocation.toolCallId}`,
              component: (
                <ToolResultRenderer
                  toolName={invocation.toolName}
                  result={invocation.result}
                />
              ),
              isCollapsed: true
            })
          }
        }
      }
    }
  }

  // Render inquiry annotation if present
  const inquiry = annotations.find((a: Annotation) => a.type === 'inquiry')
  if (inquiry) {
    renderedMessages.push({
      id: 'inquiry',
      component: <Copilot inquiry={{ value: inquiry.data }} />
    })
  }

  // Render related queries annotation
  const related = annotations.findLast?.((a: Annotation) => a.type === 'related')
  if (related && related.relatedQueries?.items?.length > 0) {
    renderedMessages.push({
      id: 'related',
      component: (
        <Section title="Related" separator={true}>
          <SearchRelated relatedQueries={related.relatedQueries} />
        </Section>
      )
    })
  }

  // Find last assistant message index for isLastMessage prop
  let lastAssistantIndex = -1
  for (let i = renderedMessages.length - 1; i >= 0; i--) {
    if (renderedMessages[i].isAssistant) {
      lastAssistantIndex = i
      break
    }
  }

  return (
    <>
      {renderedMessages.map((msg, index) => (
        <CollapsibleMessage
          key={msg.id}
          message={{
            id: msg.id,
            component: <div>{msg.component}</div>,
            isCollapsed: msg.isCollapsed
          }}
          isLastMessage={index === lastAssistantIndex}
        />
      ))}
    </>
  )
}
