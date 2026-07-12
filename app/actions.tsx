import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState
} from 'ai/rsc'
import { CoreMessage, ToolResultPart, TextPart, ImagePart, embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'
import { nanoid } from '@/lib/utils'
import type { FeatureCollection } from 'geojson'
import { Spinner } from '@/components/ui/spinner'
import { Section } from '@/components/section'
import { FollowupPanel } from '@/components/followup-panel'
import { inquire, researcher, taskManager, querySuggestor } from '@/lib/agents'
import { resolutionSearch, type DrawnFeature } from '@/lib/agents/resolution-search'
import { writer } from '@/lib/agents/writer'
import { saveChat, getSystemPrompt, generateReportContext } from '@/lib/actions/chat'
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
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/db'
import { documents, documentChunks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Define the type for related queries
type RelatedQueries = {
  items: { query: string }[]
}

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize))
    i += chunkSize - overlap
  }
  return chunks
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
          uiStream.append(
            <GeoJsonLayer
              id={groupeId}
              data={geoJson}
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
                geoJson: geoJson, // Use reconstructed GeoJSON for storage/UI
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
  console.log('File extraction:', {
    exists: !!file,
    name: file?.name,
    type: file?.type,
    size: file?.size
  })
  const userInput = skip
    ? `{"action": "skip"}`
    : ((formData?.get('related_query') as string) ||
      (formData?.get('input') as string))

  if (userInput && (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?' || userInput.toLowerCase().trim() === 'how do i use the computer?')) {
    const definition = userInput.toLowerCase().trim() === 'how do i use the computer?' ? 'To use QCX-Terra, start by searching for a location or asking a geospatial question. You can also draw features on the map to focus your analysis. QCX-Terra uses multi-agent automation to streamline exploration and provide precise environmental insights.' : userInput.toLowerCase().trim() === 'what is a planet computer?'
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
          type
        }
      ]
    });

    const summaryStream = createStreamableValue<string>(definition);
    summaryStream.done(definition);

    uiStream.update(
      <Section title="response">
        <BotMessage content={summaryStream.value} />
      </Section>
    );

    isGenerating.done(false);
    uiStream.done();

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: groupeId,
          role: 'assistant',
          content: definition,
          type: 'definition'
        }
      ]
    });

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value
    };
  }

  const userId = await getCurrentUserIdOnServer()

  // Handle document attachment if uploaded via browser client to Storage
  const documentStoragePath = formData?.get('documentStoragePath') as string
  const documentMime = formData?.get('documentMime') as string
  const documentName = formData?.get('documentName') as string

  if (documentStoragePath && userId) {
    let docId: string | null = null
    try {
      const supabase = createClient()

      // First, create the document row
      const [docRow] = await db.insert(documents).values({
        userId: userId,
        chatId: aiState.get().chatId,
        storagePath: documentStoragePath,
        mime: documentMime,
        status: 'processing'
      }).returning({ id: documents.id })
      docId = docRow.id

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('chat-attachments')
        .download(documentStoragePath)

      if (downloadError) {
        throw downloadError
      }

      if (!fileData) {
        throw new Error('Downloaded file data is null')
      }

      // Validate the actual file: trust the downloaded content over the submitted MIME
      const buffer = await fileData.arrayBuffer()
      const byteLength = buffer.byteLength

      // Reject oversized files (max 5 MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024
      if (byteLength > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${byteLength} bytes exceeds ${MAX_FILE_SIZE} byte limit`)
      }

      // Validate MIME type against allowed types
      const ALLOWED_MIMES = ['text/plain', 'text/markdown', 'application/pdf', 'text/csv', 'application/json']
      const actualMime = fileData.type || documentMime || ''
      if (!ALLOWED_MIMES.includes(actualMime)) {
        throw new Error(`Unsupported MIME type: ${actualMime}`)
      }

      const text = await fileData.text()

      const chunks = chunkText(text)
      // Cap chunks to prevent runaway embedding costs (max 50 chunks)
      const MAX_CHUNKS = 50
      const cappedChunks = chunks.slice(0, MAX_CHUNKS)

      if (cappedChunks.length > 0) {
        const { embeddings } = await embedMany({
          model: openai.embedding('text-embedding-ada-002'),
          values: cappedChunks,
        })

        const chunkRows = cappedChunks.map((chunk, idx) => ({
          documentId: docRow.id,
          chunkText: chunk,
          embedding: embeddings[idx]
        }))

        await db.insert(documentChunks).values(chunkRows)
      }

      await db.update(documents)
        .set({ status: 'complete' })
        .where(eq(documents.id, docRow.id))

    } catch (err) {
      console.error('[Document Ingestion] Failed to ingest document:', err)
      // Update the existing row to error status instead of inserting a duplicate
      if (docId) {
        try {
          await db.update(documents)
            .set({ status: 'error' })
            .where(eq(documents.id, docId))
        } catch (e) {
          console.error('[Document Ingestion] Failed to update document to error status:', e)
        }
      }
    }
  }

  const currentSystemPrompt = userId ? await getSystemPrompt(userId) : null
  const maxMessages = 10
  const messages = aiState.get().messages.map(message => ({
    role: message.role,
    content: message.content,
    name: message.name
  })) as CoreMessage[]

  if (file) {
    const buffer = await file.arrayBuffer()
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: buffer, mimeType: file.type }
    ]
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content: JSON.stringify(Object.fromEntries(formData!)),
          type: 'input'
        }
      ]
    })
    messages.push({ role: 'user', content })
  } else {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content: JSON.stringify(Object.fromEntries(formData!)),
          type: 'input'
        }
      ]
    })
    const content = userInput
    messages.push({ role: 'user', content })
  }

  const groupeId = nanoid()

  const streamText = createStreamableValue<string>('')
  let errorOccurred = false

  async function processEvents() {
    try {
      const modifiedMessages = messages.map(msg =>
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
      const { fullResponse } = await researcher(
        currentSystemPrompt || '',
        uiStream,
        streamText,
        latestMessages,
        'mapbox', // default provider
        false,
        drawnFeatures
      )

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
              content: fullResponse,
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
    } catch (error) {
      console.error('Error in researcher:', error)
      errorOccurred = true
      streamText.error(error)
    } finally {
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
              case 'documentRetrieve': {
                const adaptedResults = {
                  results: toolOutput.map((r: any) => ({
                    title: `Document Match (Similarity: ${(r.similarity * 100).toFixed(1)}%)`,
                    content: r.chunkText,
                    url: ''
                  })),
                  query: '',
                  images: []
                }
                return {
                  id,
                  component: <RetrieveSection data={adaptedResults} />,
                  isCollapsed: isCollapsed.value
                }
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
