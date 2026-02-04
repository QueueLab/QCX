import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState
} from 'ai/rsc'
import { CoreMessage, ToolResultPart } from 'ai'
import { nanoid } from 'nanoid'
import type { FeatureCollection } from 'geojson'
import { Spinner } from '@/components/ui/spinner'
import { Section } from '@/components/section'
import { FollowupPanel } from '@/components/followup-panel'
import { inquire, researcher, taskManager, querySuggestor, resolutionSearch, type DrawnFeature } from '@/lib/agents'
import { writer } from '@/lib/agents/writer'
import { saveChat, getSystemPrompt } from '@/lib/actions/chat'
import { Chat, AIMessage } from '@/lib/types'
import { UserMessage } from '@/components/user-message'
import { BotMessage } from '@/components/message'
import { SearchSection } from '@/components/search-section'
import SearchRelated from '@/components/search-related'
import { GeoJsonLayer } from '@/components/map/geojson-layer'
import { ResolutionImage } from '@/components/resolution-image'
import { CopilotDisplay } from '@/components/copilot-display'
import RetrieveSection from '@/components/retrieve-section'
import { VideoSearchSection } from '@/components/video-search-section'
import { MapQueryHandler } from '@/components/map/map-query-handler'

// Define the type for related queries
type RelatedQueries = {
  items: { query: string }[]
}

async function submit(formData?: FormData, skip?: boolean) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()
  const uiStream = createStreamableUI()
  const isGenerating = createStreamableValue(true)
  const isCollapsed = createStreamableValue(false)

  const action = formData?.get('action') as string;
  const drawnFeaturesString = formData?.get('drawnFeatures') as string;
  const mapProvider = (formData?.get('mapProvider') as string) || 'mapbox';
  let drawnFeatures: DrawnFeature[] = [];
  try {
    drawnFeatures = drawnFeaturesString ? JSON.parse(drawnFeaturesString) : [];
  } catch (e) {
    console.error('Failed to parse drawnFeatures:', e);
  }

  if (action === 'resolution_search') {
    const file = formData?.get('file') as File;
    const timezone = (formData?.get('timezone') as string) || 'UTC';

    if (!file) {
      throw new Error('No file provided for resolution search.');
    }

    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
      message =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    );

    const userInput = 'Analyze this map view.';
    const content: any[] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content: JSON.stringify(content), type: 'input' }
      ]
    });
    messages.push({ role: 'user', content: content as any });

    const summaryStream = createStreamableValue<string>('Analyzing map view...');
    const groupeId = nanoid();

    async function processResolutionSearch() {
      try {
        const streamResult = await resolutionSearch(messages, timezone, drawnFeatures);

        let fullSummary = '';
        for await (const partialObject of streamResult.partialObjectStream) {
          if (partialObject.summary) {
            fullSummary = partialObject.summary;
            summaryStream.update(fullSummary);
          }
        }

        const analysisResult = await streamResult.object;
        summaryStream.done(analysisResult.summary || 'Analysis complete.');

        if (analysisResult.geoJson) {
          uiStream.append(
            <GeoJsonLayer
              id={groupeId}
              data={analysisResult.geoJson as FeatureCollection}
            />
          );
        }

        messages.push({ role: 'assistant', content: analysisResult.summary || 'Analysis complete.' });

        const sanitizedMessages: CoreMessage[] = messages.map(m => {
          if (Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.filter(part => part.type !== 'image')
            } as CoreMessage
          }
          return m
        })

        const relatedQueries = await querySuggestor(uiStream, sanitizedMessages);
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        );

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: analysisResult.summary || 'Analysis complete.',
              type: 'response'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify({
                ...analysisResult,
                image: dataUrl
              }),
              type: 'resolution_search_result'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup'
            }
          ]
        });
      } catch (error) {
        console.error('Error in resolution search:', error);
        summaryStream.error(error);
      } finally {
        isGenerating.done(false);
        uiStream.done();
      }
    }

    processResolutionSearch();

    uiStream.update(
      <Section title="response">
        <ResolutionImage src={dataUrl} />
        <BotMessage content={summaryStream.value} />
      </Section>
    );

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value
    };
  }

  const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
    message =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end' &&
      message.type !== 'resolution_search_result'
  );

  const input = formData?.get('input') as string
  const file = formData?.get('file') as File

  if (skip) {
    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: 'Analysis skipped.',
          type: 'response'
        }
      ]
    })

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: (
        <Section title="response">
          <BotMessage content={createStreamableValue('Analysis skipped.').value} />
        </Section>
      ),
      isCollapsed: isCollapsed.value
    }
  }

  const content: any[] = []
  if (input) {
    content.push({ type: 'text', text: input })
  }

  let dataUrl: string | null = null
  if (file && file.type.startsWith('image/')) {
    const buffer = await file.arrayBuffer()
    dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
    content.push({ type: 'image', image: dataUrl, mimeType: file.type })
  }

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content: JSON.stringify(content),
        type: 'input'
      }
    ]
  })
  messages.push({ role: 'user', content: content as any })

  const summaryStream = createStreamableValue('')
  const groupId = nanoid()

  async function processChat() {
    try {
      const { getCurrentUserIdOnServer } = await import(
        '@/lib/auth/get-current-user'
      )
      const actualUserId = await getCurrentUserIdOnServer()
      const systemPrompt = await getSystemPrompt(actualUserId || '') || '';
      const { fullResponse } = await researcher(
        systemPrompt,
        uiStream,
        summaryStream,
        messages,
        mapProvider as any,
        false,
        drawnFeatures
      );

      summaryStream.done(fullResponse)

      const relatedQueries = await querySuggestor(uiStream, messages)

      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: groupId,
            role: 'assistant',
            content: fullResponse,
            type: 'response'
          },
          {
            id: groupId,
            role: 'assistant',
            content: JSON.stringify(relatedQueries),
            type: 'related'
          },
          {
            id: groupId,
            role: 'assistant',
            content: 'followup',
            type: 'followup'
          }
        ]
      })
    } catch (error) {
      console.error('Error in chat processing:', error)
      summaryStream.error(error)
    } finally {
      isGenerating.done(false)
      uiStream.done()
    }
  }

  processChat()

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'data'
  content: string | any[]
  id: string
  type?:
    | 'input'
    | 'input_related'
    | 'response'
    | 'inquiry'
    | 'related'
    | 'followup'
    | 'end'
    | 'resolution_search_result'
    | 'tool'
    | 'skip'
    | 'drawing_context'
  name?: string
}

export type AIState = {
  chatId: string
  messages: Message[]
  isSharePage?: boolean
}

export type UIState = {
  id: string
  component: React.ReactNode
  isCollapsed?: boolean
}[]

export const getUIStateFromAIState = (aiState: AIState): UIState => {
  const chatId = aiState.chatId
  const isSharePage = aiState.isSharePage
  return aiState.messages
    .map((message, index) => {
      const { role, content, id, type, name } = message

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
              let messageContent: any
              try {
                const json = typeof content === 'string' ? JSON.parse(content) : content
                if (type === 'input') {
                   messageContent = Array.isArray(json) ? json : (json.input || json);
                } else {
                   messageContent = json.related_query || json;
                }
              } catch (e) {
                messageContent = content
              }
              return {
                id,
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
                component: <CopilotDisplay content={content as string} />
              }
          }
          break
        case 'assistant':
          const answer = createStreamableValue(content as string)
          answer.done(content as string)
          switch (type) {
            case 'response':
              return {
                id,
                component: (
                  <Section title="response">
                    <BotMessage content={answer.value} />
                  </Section>
                )
              }
            case 'related':
              const relatedQueries = createStreamableValue<RelatedQueries>({
                items: []
              })
              try {
                relatedQueries.done(JSON.parse(content as string))
              } catch (e) {
                relatedQueries.done({ items: [] })
              }
              return {
                id,
                component: (
                  <Section title="Related" separator={true}>
                    <SearchRelated relatedQueries={relatedQueries.value} />
                  </Section>
                )
              }
            case 'followup':
              return {
                id,
                component: (
                  <Section title="Follow-up" className="pb-8">
                    <FollowupPanel />
                  </Section>
                )
              }
            case 'resolution_search_result': {
              try {
                const analysisResult = JSON.parse(content as string);
                const geoJson = analysisResult.geoJson as FeatureCollection;
                const image = analysisResult.image as string;

                return {
                  id,
                  component: (
                    <>
                      {image && <ResolutionImage src={image} />}
                      {geoJson && (
                        <GeoJsonLayer id={id} data={geoJson} />
                      )}
                    </>
                  )
                }
              } catch (e) {
                return null;
              }
            }
          }
          break
        case 'tool':
          try {
            const toolOutput = JSON.parse(content as string)
            const isCollapsed = createStreamableValue(true)
            isCollapsed.done(true)

            if (
              toolOutput.type === 'MAP_QUERY_TRIGGER' &&
              name === 'geospatialQueryTool'
            ) {
              const mapUrl = toolOutput.mcp_response?.mapUrl;
              const placeName = toolOutput.mcp_response?.location?.place_name;

              return {
                id,
                component: (
                  <>
                    {mapUrl && (
                      <ResolutionImage
                        src={mapUrl}
                        className="mb-0"
                        alt={placeName ? `Map of ${placeName}` : 'Map Preview'}
                      />
                    )}
                    <MapQueryHandler toolOutput={toolOutput} />
                  </>
                ),
                isCollapsed: false
              }
            }
            return {
              id,
              component: <RetrieveSection data={toolOutput} />,
              isCollapsed: isCollapsed.value
            }
          } catch (e) {
            return null
          }
        default:
          return null
      }
    })
    .filter(message => message !== null) as UIState
}

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
    clearChat: async () => {
      'use server'
      const aiState = getMutableAIState<typeof AI>()
      aiState.done({ ...aiState.get(), messages: [] })
    }
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onSetAIState: async ({ state, done }) => {
    'use server'
    if (!done) return

    const { chatId, messages } = state
    const createdAt = new Date()
    const path = `/search/${chatId}`

    let title = 'Untitled Chat'
    if (messages.length > 0) {
      const firstMessageContent = messages[0].content
      if (typeof firstMessageContent === 'string') {
        try {
          const parsedContent = JSON.parse(firstMessageContent)
          if (Array.isArray(parsedContent)) {
             const textPart = parsedContent.find(p => p.type === 'text');
             title = textPart?.text?.substring(0, 100) || 'Untitled Chat';
          } else {
             title = parsedContent.input?.substring(0, 100) || firstMessageContent.substring(0, 100)
          }
        } catch (e) {
          title = firstMessageContent.substring(0, 100)
        }
      }
    }

    const updatedMessages: AIMessage[] = (messages as any[]).map(m => ({
       ...m,
       role: m.role as any,
       type: m.type as any
    }))
    updatedMessages.push({
        id: nanoid(),
        role: 'assistant',
        content: `end`,
        type: 'end'
    })

    const { getCurrentUserIdOnServer } = await import(
      '@/lib/auth/get-current-user'
    )
    const actualUserId = await getCurrentUserIdOnServer()

    if (!actualUserId) {
      console.error('onSetAIState: User not authenticated. Chat not saved.')
      return
    }

    const chat: Chat = {
      id: chatId,
      createdAt,
      userId: actualUserId,
      path,
      title,
      messages: updatedMessages
    }
    await saveChat(chat, actualUserId)
  }
})
