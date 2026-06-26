import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState
} from 'ai/rsc'
import { CoreMessage, ToolResultPart, TextPart, ImagePart } from 'ai'
import { nanoid } from '@/lib/utils'
import type { FeatureCollection } from 'geojson'
import { Spinner } from '@/components/ui/spinner'
import { Section } from '@/components/section'
import { FollowupPanel } from '@/components/followup-panel'
import { inquire, researcher, taskManager, querySuggestor, resolutionSearch, type DrawnFeature } from '@/lib/agents'
import { writer } from '@/lib/agents/writer'
import { saveChat, getSystemPrompt, generateReportContext, getDrawingContext } from '@/lib/actions/chat'
import { Chat, AIMessage } from '@/lib/types'
import { UserMessage } from '@/components/user-message'
import { BotMessage } from '@/components/message'
import { SearchSection } from '@/components/search-section'
import { SearchRelated } from '@/components/search-related'
import { VideoSearchSection } from '@/components/video-search-section'
import { RetrieveSection } from '@/components/retrieve-section'
import { CopilotDisplay } from '@/components/copilot-display'
import { MapQueryHandler } from '@/components/map-query-handler'
import { ResolutionCarousel } from '@/components/resolution-carousel'
import { ResolutionImage } from '@/components/resolution-image'
import { GeoJsonLayer } from '@/components/map/geojson-layer'
import { RelatedQueries } from '@/lib/types'
import { getNotes } from '@/lib/actions/calendar'

async function submit(formData?: FormData, skip?: boolean) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()
  const uiStream = createStreamableUI()
  const isGenerating = createStreamableValue(true)
  const isCollapsed = createStreamableValue(false)

  const action = formData?.get('action') as string;
  const drawnFeaturesString = formData?.get('drawnFeatures') as string;
  let drawnFeatures: DrawnFeature[] = [];
  try {
    drawnFeatures = drawnFeaturesString ? JSON.parse(drawnFeaturesString) : [];
  } catch (e) {
    console.error('Failed to parse drawnFeatures:', e);
  }

  const chatId = aiState.get().chatId;
  if (chatId && drawnFeatures.length === 0) {
    const drawingContext = await getDrawingContext(chatId);
    if (drawingContext) {
      drawnFeatures = (drawingContext as any).drawnFeatures || [];
    }
  }

  if (action === 'generate_report_context') {
    const messagesString = formData?.get('messages');
    if (typeof messagesString !== 'string') {
      return { title: 'QCX Intelligence Analysis', summary: 'Automated executive summary is currently unavailable.' };
    }
    try {
      const messages = JSON.parse(messagesString) as AIMessage[];
      return await generateReportContext(messages);
    } catch (e) {
      console.error('Failed to parse messages for report context:', e);
      return { title: 'QCX Intelligence Analysis', summary: 'Automated executive summary is currently unavailable.' };
    }
  }

  if (action === 'resolution_search') {
    const file_mapbox = formData?.get('file_mapbox') as File;
    const file_google = formData?.get('file_google') as File;
    const file = (formData?.get('file') as File) || file_mapbox || file_google;
    const timezone = (formData?.get('timezone') as string) || 'UTC';
    const lat = formData?.get('latitude') ? parseFloat(formData.get('latitude') as string) : undefined;
    const lng = formData?.get('longitude') ? parseFloat(formData.get('longitude') as string) : undefined;
    const location = (lat !== undefined && lng !== undefined) ? { lat, lng } : undefined;

    if (!file) {
      throw new Error('No file provided for resolution search.');
    }

    const mapboxBuffer = file_mapbox ? await file_mapbox.arrayBuffer() : null;
    const mapboxDataUrl = mapboxBuffer ? `data:${file_mapbox.type};base64,${Buffer.from(mapboxBuffer).toString('base64')}` : null;

    const googleBuffer = file_google ? await file_google.arrayBuffer() : null;
    const googleDataUrl = googleBuffer ? `data:${file_google.type};base64,${Buffer.from(googleBuffer).toString('base64')}` : null;

    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
      (message: any) =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    );

    const userInput = 'Analyze this map view.';
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content, type: 'input' }
      ]
    });
    messages.push({ role: 'user', content });

    const summaryStream = createStreamableValue<string>('Analyzing map view...');
    const groupeId = nanoid();

    async function processResolutionSearch() {
      try {
        const streamResult = await resolutionSearch(messages, timezone, drawnFeatures, location);

        let fullSummary = '';
        for await (const partialObject of streamResult.partialObjectStream) {
          if (partialObject.summary) {
            fullSummary = partialObject.summary;
            summaryStream.update(fullSummary);
          }
        }

        const analysisResult = await streamResult.object;
        summaryStream.done(analysisResult.summary || 'Analysis complete.');

        // Reconstruct standard GeoJSON from flattened schema if present
        let geoJson: FeatureCollection | null = null;
        if (analysisResult.geoJson && analysisResult.geoJson.features) {
          geoJson = {
            type: 'FeatureCollection',
            features: analysisResult.geoJson.features.map(f => ({
              type: 'Feature',
              geometry: {
                type: f.geometryType as any,
                coordinates: f.coordinates as any
              },
              properties: {
                name: f.name,
                description: f.description
              }
            }))
          };
        }

        if (geoJson) {
          uiStream.append(<GeoJsonLayer id={groupeId} data={geoJson} />);
        }

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify({
                ...analysisResult,
                geoJson,
                image: dataUrl,
                mapboxImage: mapboxDataUrl,
                googleImage: googleDataUrl
              }),
              type: 'resolution_search_result'
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

    return {
      id: groupeId,
      component: (
        <Section title="Map Analysis">
          <ResolutionCarousel
            mapboxImage={mapboxDataUrl}
            googleImage={googleDataUrl}
            initialImage={dataUrl}
          />
          <BotMessage content={summaryStream.value} />
        </Section>
      ),
      isGenerating: isGenerating.value
    };
  }

  const userInput = skip
    ? `What's next?`
    : (formData?.get('input') as string) || '';
  const content: CoreMessage['content'] = [{ type: 'text', text: userInput }];

  const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
    (message: any) =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end'
  )

  if (skip) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: `OK, what else can I help you with?`,
          type: 'response'
        }
      ]
    })
  } else {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content: userInput,
          type: 'input'
        }
      ]
    })
    messages.push({ role: 'user', content })
  }

  const { getCurrentUserIdOnServer } = await import(
    '@/lib/auth/get-current-user'
  )
  const userId = await getCurrentUserIdOnServer()
  const currentSystemPrompt = await getSystemPrompt(userId || '')

  const useSpecificAPI =
    (formData?.get('useSpecificAPI') as string) === 'true'
  const maxMessages = 10
  const mapProvider = (formData?.get('mapProvider') as any) || 'mapbox'

  const groupeId = nanoid()

  const processEvents = async () => {
    let inquiry: any = null
    let researcherResult: any = null

    // Fetch calendar notes for context
    let calendarNotesContext = '';
    try {
      if (chatId) {
        const notes = await getNotes(new Date(), chatId);
        if (notes && notes.length > 0) {
          calendarNotesContext = `\n\nRelevant calendar notes for today in this chat:\n${notes.map(n => `- ${n.content}`).join('\n')}`;
        }
      }
    } catch (e) {
      console.error('Failed to fetch calendar notes for context:', e);
    }

    if (!skip) {
      inquiry = await inquire(uiStream, messages)
    }

    if (inquiry) {
      isGenerating.done(false)
      uiStream.done()
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: JSON.stringify(inquiry),
            type: 'inquiry'
          }
        ]
      })
      return
    }

    isCollapsed.done(true)
    let answer = ''
    let toolOutputs: ToolResultPart[] = []
    let errorOccurred = false
    const streamText = createStreamableValue<string>()
    uiStream.update(<Spinner />)

    while (
      useSpecificAPI
        ? answer.length === 0
        : answer.length === 0 && !errorOccurred
    ) {
      const { fullResponse, hasError, toolResponses } = await researcher(
        currentSystemPrompt + calendarNotesContext,
        uiStream,
        streamText,
        messages,
        mapProvider,
        useSpecificAPI,
        drawnFeatures
      )
      answer = fullResponse
      toolOutputs = toolResponses
      errorOccurred = hasError

      if (toolOutputs.length > 0) {
        toolOutputs.map(output => {
          aiState.update({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: groupeId,
                role: 'tool',
                content: JSON.stringify(output.result),
                name: output.toolName,
                type: 'tool'
              }
            ]
          })
        })
      }
    }

    if (!useSpecificAPI && answer.length > 0) {
      const modifiedMessages = messages
        .map(msg =>
          msg.role === 'tool'
            ? {
                role: 'assistant',
                content: JSON.stringify(msg.content),
                type: 'tool'
              }
            : msg
        ) as CoreMessage[]
      const latestMessages = modifiedMessages.slice(maxMessages * -1)
      answer = await writer(
        currentSystemPrompt + calendarNotesContext,
        uiStream,
        streamText,
        latestMessages
      )
    } else {
      streamText.done()
    }

    if (!errorOccurred) {
      const relatedQueries = await querySuggestor(uiStream, messages)
      uiStream.append(
        <Section title="Follow-up">
          <FollowupPanel />
        </Section>
      )

      await new Promise(resolve => setTimeout(resolve, 500))

      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: groupeId,
            role: 'assistant',
            content: answer,
            type: 'response'
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
      })
    }

    isGenerating.done(false)
    uiStream.done()
  }

  processEvents()

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  }
}

async function clearChat() {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.done({
    chatId: nanoid(),
    messages: []
  })
}

export type AIState = {
  messages: AIMessage[]
  chatId: string
  isSharePage?: boolean
}

export type UIState = {
  id: string
  component: React.ReactNode
  isGenerating?: StreamableValue<boolean>
  isCollapsed?: StreamableValue<boolean>
}[]

const initialAIState: AIState = {
  chatId: nanoid(),
  messages: []
}

const initialUIState: UIState = []

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
    clearChat
  },
  initialUIState,
  initialAIState,
  onGetUIState: async () => {
    'use server'

    const aiState = getAIState() as AIState
    if (aiState) {
      const uiState = getUIStateFromAIState(aiState)
      return uiState
    }
    return initialUIState
  },
  onSetAIState: async ({ state }) => {
    'use server'

    if (!state.messages.some(e => e.type === 'response')) {
      return
    }

    const { chatId, messages } = state
    const createdAt = new Date()

    let title = 'Untitled Chat'
    if (messages.length > 0) {
      const firstMessageContent = messages[0].content
      if (typeof firstMessageContent === 'string') {
        try {
          const parsedContent = JSON.parse(firstMessageContent)
          title = parsedContent.input?.substring(0, 100) || 'Untitled Chat'
        } catch (e) {
          title = firstMessageContent.substring(0, 100)
        }
      } else if (Array.isArray(firstMessageContent)) {
        const textPart = (
          firstMessageContent as { type: string; text?: string }[]
        ).find(p => p.type === 'text')
        title =
          textPart && textPart.text
            ? textPart.text.substring(0, 100)
            : 'Image Message'
      }
    }

    const updatedMessages: AIMessage[] = [
      ...messages,
      {
        id: nanoid(),
        role: 'assistant',
        content: `end`,
        type: 'end'
      }
    ]

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
      title,
      messages: updatedMessages
    }
    await saveChat(chat, actualUserId)
  }
})

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
              relatedQueries.done(JSON.parse(content as string))
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
              const analysisResult = JSON.parse(content as string);
              const geoJson = analysisResult.geoJson as FeatureCollection;
              const image = analysisResult.image as string;
              const mapboxImage = analysisResult.mapboxImage as string;
              const googleImage = analysisResult.googleImage as string;

              return {
                id,
                component: (
                  <>
                    <ResolutionCarousel
                      mapboxImage={mapboxImage}
                      googleImage={googleImage}
                      initialImage={image}
                    />
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

            const searchResults = createStreamableValue(
              JSON.stringify(toolOutput)
            )
            searchResults.done(JSON.stringify(toolOutput))
            switch (name) {
              case 'search':
                return {
                  id,
                  component: <SearchSection result={searchResults.value} />,
                  isCollapsed: isCollapsed.value
                }
              case 'retrieve':
                return {
                  id,
                  component: <RetrieveSection data={toolOutput} />,
                  isCollapsed: isCollapsed.value
                }
              case 'videoSearch':
                return {
                  id,
                  component: (
                    <VideoSearchSection result={searchResults.value} />
                  ),
                  isCollapsed: isCollapsed.value
                }
              default:
                console.warn(
                  `Unhandled tool result in getUIStateFromAIState: ${name}`
                )
                return { id, component: null }
            }
          } catch (error) {
            console.error(
              'Error parsing tool content in getUIStateFromAIState:',
              error
            )
            return {
              id,
              component: null
            }
          }
          break
        default:
          return {
            id,
            component: null
          }
      }
    })
    .filter(message => message !== null) as UIState
}
