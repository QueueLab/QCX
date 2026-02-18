import React from 'react'
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
import { MapResultsContainer } from '@/components/map/map-results-container'
import { ResolutionCarousel } from '@/components/resolution-carousel'
import { ResolutionImage } from '@/components/resolution-image'
import { CopilotDisplay } from '@/components/copilot-display'
import RetrieveSection from '@/components/retrieve-section'
import { VideoSearchSection } from '@/components/video-search-section'
import { MapQueryHandler } from '@/components/map/map-query-handler'

export type UIState = {
  id: string
  component: React.ReactNode
  isCollapsed?: StreamableValue<boolean>
}[]

export type AIState = {
  chatId: string
  messages: AIMessage[]
}


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

  const locationString = formData?.get('location') as string;
  let location: { lat: number, lng: number } | undefined;
  try {
    location = locationString ? JSON.parse(locationString) : undefined;
  } catch (e) {
    console.error('Failed to parse location:', e);
  }

  const timezone = (formData?.get('timezone') as string) || 'UTC';

  if (action === 'resolution_search') {
    const file = formData?.get('file') as File;
    const mapboxImage = formData?.get('mapboxImage') as string;
    const googleImage = formData?.get('googleImage') as string;

    if (!file) {
      isGenerating.done(false);
      return { id: nanoid(), isGenerating: isGenerating.value, component: null, isCollapsed: isCollapsed.value };
    }

    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;
    const mapboxDataUrl = mapboxImage || null;
    const googleDataUrl = googleImage || null;

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

        // Handle elevation heat map if requested
        let elevationPointsData = null;
        if (analysisResult.elevationData?.requested && analysisResult.elevationData.bounds) {
          try {
            const elevationResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/elevation?` +
              `bounds=${JSON.stringify(analysisResult.elevationData.bounds)}&gridSize=${analysisResult.elevationData.gridSize || 20}${
                drawnFeatures.length > 0 && drawnFeatures[0].geometry
                  ? `&geometry=${JSON.stringify(drawnFeatures[0].geometry)}`
                  : ''
              }`
            );

            if (elevationResponse.ok) {
              const elevationData = await elevationResponse.json();
              if (elevationData.success && elevationData.points.length > 0) {
                elevationPointsData = elevationData;
              }
            }
          } catch (error) {
            console.error('Error fetching elevation data:', error);
          }
        }

        if (analysisResult.geoJson || elevationPointsData) {
          uiStream.append(
            <MapResultsContainer
              id={groupeId}
              geoJson={analysisResult.geoJson as FeatureCollection}
              elevationPoints={elevationPointsData}
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
                googleImage: googleDataUrl,
                elevationPoints: elevationPointsData
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
      isGenerating.done(false)
      isCollapsed.done(false)
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: groupeId,
            role: 'assistant',
            content: JSON.stringify(inquiry),
            type: 'inquiry'
          }
        ]
      })
    } else {
      const { fullResponse, hasError, toolResponses } = await researcher(
        currentSystemPrompt,
        uiStream,
        createStreamableValue(''),
        messages,
        mapProvider,
        useSpecificAPI,
        drawnFeatures
      )

      if (hasError) {
        isGenerating.done(false)
        uiStream.done()
        return
      }

      const answer = await writer(uiStream, messages, toolResponses)

      const relatedQueries = await querySuggestor(uiStream, messages)

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

      isGenerating.done(false)
      uiStream.done()
    }
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
    ...aiState.get(),
    messages: []
  })
}

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
    clearChat
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onSetAIState: async ({ state, done }) => {
    'use server'
    if (done) {
      saveChat(state as Chat).catch(e => console.error('Failed to save chat:', e))
    }
  }
})

export function getUIStateFromAIState(aiState: Chat) {
  return aiState.messages
    .map((message, index) => {
      const { role, content, id, type, name } = message

      if (role === 'user' || role === 'system') {
        return null
      }

      switch (type) {
        case 'response':
          return {
            id,
            component: <BotMessage content={content as string} />
          }
        case 'related':
          const relatedQueries = JSON.parse(content as string)
          return {
            id,
            component: <SearchRelated queries={relatedQueries} />,
            isCollapsed: true
          }
        case 'followup':
          return {
            id,
            component: (
              <Section title="Follow-up">
                <FollowupPanel />
              </Section>
            )
          }
        case 'inquiry':
          return {
            id,
            component: <CopilotDisplay inquiry={JSON.parse(content as string)} />
          }
        case 'resolution_search_result': {
          const analysisResult = JSON.parse(content as string);
          const geoJson = analysisResult.geoJson as FeatureCollection;
          const image = analysisResult.image as string;
          const mapboxImage = analysisResult.mapboxImage as string;
          const googleImage = analysisResult.googleImage as string;
          const elevationPoints = analysisResult.elevationPoints;

          return {
            id,
            component: (
              <>
                <ResolutionCarousel
                  mapboxImage={mapboxImage}
                  googleImage={googleImage}
                  initialImage={image}
                />
                <MapResultsContainer
                  id={id}
                  geoJson={geoJson}
                  elevationPoints={elevationPoints}
                />
              </>
            )
          }
        }
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
        default:
          return {
            id,
            component: null
          }
      }
    })
    .filter(message => message !== null) as UIState
}
