import React from 'react'
import { AIState, UIState } from './types'
import { UserMessage } from '@/components/user-message'
import { CopilotDisplay } from '@/components/copilot-display'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import SearchRelated from '@/components/search-related'
import { FollowupPanel } from '@/components/followup-panel'
import { GeoJsonLayer } from '@/components/map/geojson-layer'
import { MapQueryHandler } from '@/components/map/map-query-handler'
import { SearchSection } from '@/components/search-section'
import RetrieveSection from '@/components/retrieve-section'
import { VideoSearchSection } from '@/components/video-search-section'
import { createStreamableValue } from 'ai/rsc'
import type { FeatureCollection } from 'geojson'

type RelatedQueries = {
  items: { query: string }[]
}

export const getUIStateFromAIState = (aiState: AIState): UIState => {
  const chatId = aiState.chatId
  const isSharePage = aiState.isSharePage
  return aiState.messages
    .map((message, index) => {
      const { role, content, id, type, name, threadId: tid } = message
      const threadId = tid || aiState.chatId

      if (
        !type ||
        type === 'end' ||
        (isSharePage && type === 'related') ||
        (isSharePage && type === 'followup')
      )
        return null

      switch (role) {
        case 'user':
          switch (type) {
            case 'input':
            case 'input_related':
              let messageContent: string | any[]
              try {
                const json = JSON.parse(content as string)
                messageContent =
                  type === 'input' ? json.input : json.related_query
              } catch (e) {
                messageContent = content
              }
              return {
                id,
                threadId,
                component: (
                  <UserMessage
                    content={messageContent}
                    chatId={chatId}
                    showShare={index === 0 && !isSharePage}
                  />
                )
              }
            case 'inquiry':
              return {
                id,
                threadId,
                component: <CopilotDisplay content={content as string} />
              }
          }
          break
        case 'assistant':
          const answer = createStreamableValue()
          answer.done(content)
          switch (type) {
            case 'response':
              return {
                id,
                threadId,
                component: (
                  <Section title="response">
                    <BotMessage content={answer.value} />
                  </Section>
                )
              }
            case 'related':
              const relatedQueries = createStreamableValue<RelatedQueries>()
              relatedQueries.done(JSON.parse(content as string))
              return {
                id,
                threadId,
                component: (
                  <Section title="Related" separator={true}>
                    <SearchRelated relatedQueries={relatedQueries.value} threadId={threadId} />
                  </Section>
                )
              }
            case 'followup':
              return {
                id,
                threadId,
                component: (
                  <Section title="Follow-up" className="pb-8">
                    <FollowupPanel threadId={threadId} />
                  </Section>
                )
              }
            case 'resolution_search_result': {
              const analysisResult = JSON.parse(content as string);
              const geoJson = analysisResult.geoJson as FeatureCollection;

              return {
                id,
                threadId,
                component: (
                  <>
                    {geoJson && (
                      <GeoJsonLayer id={id} data={geoJson} />
                    )}
                  </>
                )
              }
            }
          }
          break
        case 'tool':
          try {
            const toolOutput = JSON.parse(content as string)
            const isCollapsed = createStreamableValue()
            isCollapsed.done(true)

            if (
              toolOutput.type === 'MAP_QUERY_TRIGGER' &&
              name === 'geospatialQueryTool'
            ) {
              return {
                id,
                threadId,
                component: <MapQueryHandler toolOutput={toolOutput} />,
                isCollapsed: false
              }
            }

            const searchResults = createStreamableValue()
            searchResults.done(JSON.stringify(toolOutput))
            switch (name) {
              case 'search':
                return {
                  id,
                  threadId,
                  component: <SearchSection result={searchResults.value} />,
                  isCollapsed: isCollapsed.value
                }
              case 'retrieve':
                return {
                  id,
                  threadId,
                  component: <RetrieveSection data={toolOutput} />,
                  isCollapsed: isCollapsed.value
                }
              case 'videoSearch':
                return {
                  id,
                  threadId,
                  component: (
                    <VideoSearchSection result={searchResults.value} />
                  ),
                  isCollapsed: isCollapsed.value
                }
              default:
                console.warn(
                  `Unhandled tool result in getUIStateFromAIState: ${name}`
                )
                return { id, threadId, component: null }
            }
          } catch (error) {
            console.error(
              'Error parsing tool content in getUIStateFromAIState:',
              error
            )
            return {
              id,
              threadId,
              component: null
            }
          }
          break
        default:
          return {
            id,
            threadId,
            component: null
          }
      }
    })
    .filter(message => message !== null) as UIState
}
