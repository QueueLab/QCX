import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState
} from 'ai/rsc'
import { CoreMessage, ToolResultPart } from 'ai'
import { nanoid } from '@/lib/utils'
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
import { ResolutionCarousel } from '@/components/resolution-carousel'
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
  let drawnFeatures: DrawnFeature[] = [];
  try {
    drawnFeatures = drawnFeaturesString ? JSON.parse(drawnFeaturesString) : [];
  } catch (e) {
    console.error('Failed to parse drawnFeatures:', e);
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

        if (analysisResult.geoJson) {
          uiStream.append(
            <GeoJsonLayer
              id={groupeId}
              data={analysisResult.geoJson as FeatureCollection}
            />
          );
        }

        messages.push({ role: 'assistant', content: analysisResult.summary || 'Analysis complete.' });

        const sanitizedMessages: CoreMessage[] = messages.map((m: any) => {
          if (Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.filter((part: any) => part.type !== 'image')
            } as CoreMessage
          }
          return m
        })

        const currentMessages = aiState.get().messages;
        const sanitizedHistory = currentMessages.map((m: any) => {
          if (m.role === "user" && Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.map((part: any) =>
                part.type === "image" ? { ...part, image: "IMAGE_PROCESSED" } : part
              )
            }
          }
          return m
        });
        const relatedQueries = await querySuggestor(uiStream, sanitizedMessages);
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        );

        await new Promise(resolve => setTimeout(resolve, 500));

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
                image: dataUrl,
                mapboxImage: mapboxDataUrl,
                googleImage: googleDataUrl
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
        <ResolutionCarousel
          mapboxImage={mapboxDataUrl || undefined}
          googleImage={googleDataUrl || undefined}
          initialImage={dataUrl}
        />
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

  const file = !skip ? (formData?.get('file') as File) : undefined
  const userInput = skip
    ? `{"action": "skip"}`
    : ((formData?.get('related_query') as string) ||
      (formData?.get('input') as string))

  if (userInput && (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?')) {
    const definition = userInput.toLowerCase().trim() === 'what is a planet computer?'
      ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`
      : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing] (https://www.queue.cx/#pricing)`;

    const content = JSON.stringify(Object.fromEntries(formData!));
    const type = 'input';
    const groupeId = nanoid();

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content,
          type,
        },
      ],
    });

    const definitionStream = createStreamableValue();
    definitionStream.done(definition);

    const answerSection = (
      <Section title="response">
        <BotMessage content={definitionStream.value} />
      </Section>
    );

    uiStream.update(answerSection);

    const relatedQueries = { items: [] };

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: groupeId,
          role: 'assistant',
          content: definition,
          type: 'response',
        },
        {
          id: groupeId,
          role: 'assistant',
          content: JSON.stringify(relatedQueries),
          type: 'related',
        },
        {
          id: groupeId,
          role: 'assistant',
          content: 'followup',
          type: 'followup',
        },
      ],
    });

    isGenerating.done(false);
    uiStream.done();

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value
    };
  }

  if (!userInput && !file) {
    isGenerating.done(false)
    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: null,
      isCollapsed: isCollapsed.value
    }
  }

  const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
    (message: any) =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end' &&
      message.type !== 'resolution_search_result'
  ).map((m: any) => {
    if (Array.isArray(m.content)) {
      return {
        ...m,
        content: m.content.filter((part: any) =>
          part.type !== "image" || (typeof part.image === "string" && part.image.startsWith("data:"))
        )
      } as any
    }
    return m
  })

  const groupeId = nanoid()
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
  const maxMessages = useSpecificAPI ? 5 : 10
  messages.splice(0, Math.max(messages.length - maxMessages, 0))

  const messageParts: {
    type: 'text' | 'image'
    text?: string
    image?: string
    mimeType?: string
  }[] = []

  if (userInput) {
    messageParts.push({ type: 'text', text: userInput })
  }

  if (file) {
    const buffer = await file.arrayBuffer()
    if (file.type.startsWith('image/')) {
      const dataUrl = `data:${file.type};base64,${Buffer.from(
        buffer
      ).toString('base64')}`
      messageParts.push({
        type: 'image',
        image: dataUrl,
        mimeType: file.type
      })
    } else if (file.type === 'text/plain') {
      const textContent = Buffer.from(buffer).toString('utf-8')
      const existingTextPart = messageParts.find(p => p.type === 'text')
      if (existingTextPart) {
        existingTextPart.text = `${textContent}\n\n${existingTextPart.text}`
      } else {
        messageParts.push({ type: 'text', text: textContent })
      }
    }
  }

  const hasImage = messageParts.some(part => part.type === 'image')
  const content: CoreMessage['content'] = hasImage
    ? messageParts as CoreMessage['content']
    : messageParts.map(part => part.text).join('\n')

  const type = skip
    ? undefined
    : formData?.has('input') || formData?.has('file')
    ? 'input'
    : formData?.has('related_query')
    ? 'input_related'
    : 'inquiry'

  if (content) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content,
          type
        }
      ]
    })
    messages.push({
      role: 'user',
      content
    } as CoreMessage)
  }

  const userId = 'anonymous'
  const currentSystemPrompt = (await getSystemPrompt(userId)) || ''
  const mapProvider = formData?.get('mapProvider') as 'mapbox' | 'google'

  async function processEvents() {
    let action: any = { object: { next: 'proceed' } }
    if (!skip) {
      const taskManagerResult = await taskManager(messages)
      if (taskManagerResult) {
        action.object = taskManagerResult.object
      }
    }

    if (action.object.next === 'inquire') {
      const inquiry = await inquire(uiStream, messages)
      uiStream.done()
      isGenerating.done()
      isCollapsed.done(false)
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: `inquiry: ${inquiry?.question}`
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
        currentSystemPrompt,
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

    if (useSpecificAPI && answer.length === 0) {
      const modifiedMessages = aiState
        .get()
        .messages.map(msg =>
          msg.role === 'tool'
            ? {
                ...msg,
                role: 'assistant',
                content: JSON.stringify(msg.content),
                type: 'tool'
              }
            : msg
        ) as CoreMessage[]
      const latestMessages = modifiedMessages.slice(maxMessages * -1)
      answer = await writer(
        currentSystemPrompt,
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
    const path = `/search/${chatId}`

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
      path,
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
