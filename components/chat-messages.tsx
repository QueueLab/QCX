'use client'

import { Message } from 'ai'
import { CollapsibleMessage } from './collapsible-message'
import { UserMessage } from './user-message'
import { BotMessage } from './message'
import { Section } from './section'
import SearchRelated from './search-related'
import { FollowupPanel } from './followup-panel'
import { SearchSection } from './search-section'
import RetrieveSection from './retrieve-section'
import { VideoSearchSection } from './video-search-section'
import { MapQueryHandler } from './map/map-query-handler'
import { CopilotDisplay } from './copilot-display'
import { ResolutionSearchSection } from './resolution-search-section'

interface ChatMessagesProps {
  messages: Message[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  if (!messages.length) {
    return null
  }

  return (
    <>
      {messages.map((message, index) => {
        const { role, content, id, toolInvocations, data } = message

        if (role === 'user') {
          return (
            <CollapsibleMessage
              key={id}
              message={{
                id,
                component: (
                  <UserMessage
                    content={content}
                    showShare={index === 0}
                  />
                )
              }}
              isLastMessage={index === messages.length - 1}
            />
          )
        }

        if (role === 'assistant') {
          const extraData = Array.isArray(data) ? data : []

          return (
            <CollapsibleMessage
              key={id}
              message={{
                id,
                component: (
                  <div className="flex flex-col gap-4">
                    {content && (
                      <Section title="response">
                        <BotMessage content={content} />
                      </Section>
                    )}

                    {toolInvocations?.map((toolInvocation) => {
                      const { toolName, toolCallId, state } = toolInvocation

                      if (state === 'result') {
                        const { result } = toolInvocation

                        switch (toolName) {
                          case 'search':
                            return <SearchSection key={toolCallId} result={JSON.stringify(result)} />
                          case 'retrieve':
                            return <RetrieveSection key={toolCallId} data={result} />
                          case 'videoSearch':
                            return <VideoSearchSection key={toolCallId} result={JSON.stringify(result)} />
                          case 'geospatialQueryTool':
                            if (result.type === 'MAP_QUERY_TRIGGER') {
                              return <MapQueryHandler key={toolCallId} toolOutput={result} />
                            }
                            return null
                          default:
                            return null
                        }
                      }
                      return null
                    })}

                    {extraData.map((d: any, i) => {
                      if (d.type === 'related') {
                        return (
                          <Section key={i} title="Related" separator={true}>
                            <SearchRelated relatedQueries={d.object} />
                          </Section>
                        )
                      }
                      if (d.type === 'inquiry') {
                        return <CopilotDisplay key={i} content={d.object.question} />
                      }
                      if (d.type === 'resolution_search_result') {
                        return <ResolutionSearchSection key={i} result={d.object} />
                      }
                      return null
                    })}

                    {index === messages.length - 1 && role === 'assistant' && (
                       <Section title="Follow-up" className="pb-8">
                         <FollowupPanel />
                       </Section>
                    )}
                  </div>
                )
              }}
              isLastMessage={index === messages.length - 1}
            />
          )
        }
        return null
      })}
    </>
  )
}
