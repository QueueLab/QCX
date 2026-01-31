'use server'

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
// Removed import of useGeospatialToolMcp as it no longer exists and was incorrectly used here.
// The geospatialTool (if used by agents like researcher) now manages its own MCP client.
import { writer } from '@/lib/agents/writer'
import {
  saveChat,
  getSystemPrompt,
  updateMessage,
  deleteMessage,
  deleteTrailingMessages
} from '@/lib/actions/chat' // Added getSystemPrompt
import { Chat, AIMessage } from '@/lib/types'
import { UserMessage } from '@/components/user-message'
import { BotMessage } from '@/components/message'
import { SearchSection } from '@/components/search-section'
import SearchRelated from '@/components/search-related'
import { GeoJsonLayer } from '@/components/map/geojson-layer'
import { CopilotDisplay } from '@/components/copilot-display'
import RetrieveSection from '@/components/retrieve-section'
import { VideoSearchSection } from '@/components/video-search-section'
import { MapQueryHandler } from '@/components/map/map-query-handler' // Add this import

// Define the type for related queries
type RelatedQueries = {
  items: { query: string }[]
}

// Removed mcp parameter from submit, as geospatialTool now handles its client.
async function submit(formData?: FormData, skip?: boolean) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()
  const uiStream = createStreamableUI()
  const isGenerating = createStreamableValue(true)
  const isCollapsed = createStreamableValue(false)

  const action = formData?.get('action') as string;
  if (action === 'resolution_search') {
    const file = formData?.get('file') as File;
    const timezone = (formData?.get('timezone') as string) || 'UTC';
    const drawnFeaturesString = formData?.get('drawnFeatures') as string;
    let drawnFeatures: DrawnFeature[] = [];
    try {
      drawnFeatures = drawnFeaturesString ? JSON.parse(drawnFeaturesString) : [];
    } catch (e) {
      console.error('Failed to parse drawnFeatures:', e);
    }

    if (!file) {
      throw new Error('No file provided for resolution search.');
    }

    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    // Get the current messages, excluding tool-related ones.
    const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
      message =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    );

    // The user's prompt for this action is static.
    const userInput = 'Analyze this map view.';

    // Construct the multimodal content for the user message.
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    const messageId = (formData?.get('id') as string) || nanoid();
    // Add the new user message to the AI state.
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: messageId,
          role: 'user',
          content,
          type: 'input',
          createdAt: new Date()
        }
      ]
    });
    messages.push({ role: 'user', content });

    // Create a streamable value for the summary.
    const summaryStream = createStreamableValue<string>('');

    async function processResolutionSearch() {
      try {
        // Call the simplified agent, which now returns a stream.
        const streamResult = await resolutionSearch(messages, timezone, drawnFeatures);

        let fullSummary = '';
        for await (const partialObject of streamResult.partialObjectStream) {
          if (partialObject.summary) {
            fullSummary = partialObject.summary;
            summaryStream.update(fullSummary);
          }
        }

        const analysisResult = await streamResult.object;

        // Mark the summary stream as done with the result.
        summaryStream.done(analysisResult.summary || 'Analysis complete.');

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

        await new Promise(resolve => setTimeout(resolve, 500));

        const groupeId = nanoid();

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: analysisResult.summary || 'Analysis complete.',
              type: 'response',
              createdAt: new Date()
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(analysisResult),
              type: 'resolution_search_result',
              createdAt: new Date()
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related',
              createdAt: new Date()
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup',
              createdAt: new Date()
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

    // Start the background process without awaiting it.
    processResolutionSearch();

    // Immediately update the UI stream with the BotMessage component.
    uiStream.update(
      <Section title="response">
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
  )

  const groupeId = nanoid()
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
  const maxMessages = useSpecificAPI ? 5 : 10
  messages.splice(0, Math.max(messages.length - maxMessages, 0))

  const userInput = skip
    ? `{"action": "skip"}`
    : ((formData?.get('related_query') as string) ||
      (formData?.get('input') as string))

  if (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?') {
    const definition = userInput.toLowerCase().trim() === 'what is a planet computer?'
      ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`

      : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing] (https://www.queue.cx/#pricing)`;

    const content = JSON.stringify(Object.fromEntries(formData!));
    const type = 'input';

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content,
          type,
          createdAt: new Date()
        }
      ]
    })

    const definitionStream = createStreamableValue()
    definitionStream.done(definition)

    const answerSection = (
      <Section title="response">
        <BotMessage content={definitionStream.value} />
      </Section>
    )

    uiStream.append(answerSection)

    const groupeId = nanoid()
    const relatedQueries = { items: [] }

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: groupeId,
          role: 'assistant',
          content: definition,
          type: 'response',
          createdAt: new Date()
        },
        {
          id: groupeId,
          role: 'assistant',
          content: JSON.stringify(relatedQueries),
          type: 'related',
          createdAt: new Date()
        },
        {
          id: groupeId,
          role: 'assistant',
          content: 'followup',
          type: 'followup',
          createdAt: new Date()
        }
      ]
    })

    isGenerating.done(false);
    uiStream.done();

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value,
    };
  }
  const file = !skip ? (formData?.get('file') as File) : undefined

  if (!userInput && !file) {
    isGenerating.done(false)
    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: null,
      isCollapsed: isCollapsed.value
    }
  }

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
  // Properly type the content based on whether it contains images
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

  const messageId = (formData?.get('id') as string) || nanoid()

  if (content) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: messageId,
          role: 'user',
          content,
          type,
          createdAt: new Date()
        }
      ]
    })
    messages.push({
      role: 'user',
      content
    } as CoreMessage)
  }

  const { getCurrentUserIdOnServer } = await import(
    '@/lib/auth/get-current-user'
  )
  const userId = (await getCurrentUserIdOnServer()) || 'anonymous'
  const currentSystemPrompt = (await getSystemPrompt(userId)) || ''

  const mapProvider = formData?.get('mapProvider') as 'mapbox' | 'google'

  processChatWorkflow({
    aiState,
    uiStream,
    isGenerating,
    isCollapsed,
    messages,
    groupeId,
    currentSystemPrompt,
    mapProvider,
    useSpecificAPI,
    maxMessages,
    skipTaskManager: skip
  })

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  }
}

async function processChatWorkflow({
  aiState,
  uiStream,
  isGenerating,
  isCollapsed,
  messages,
  groupeId,
  currentSystemPrompt,
  mapProvider,
  useSpecificAPI,
  maxMessages,
  skipTaskManager = false
}: {
  aiState: any
  uiStream: any
  isGenerating: any
  isCollapsed: any
  messages: CoreMessage[]
  groupeId: string
  currentSystemPrompt: string
  mapProvider: any
  useSpecificAPI: boolean
  maxMessages: number
  skipTaskManager?: boolean
}) {
  try {
    let action: any = { object: { next: 'proceed' } }
    if (!skipTaskManager) {
      const taskManagerResult = await taskManager(messages)
      if (taskManagerResult) {
        action.object = taskManagerResult.object
      }
    }

    if (action.object.next === 'inquire') {
      const inquiry = await inquire(uiStream, messages)
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: `inquiry: ${inquiry?.question}`,
            createdAt: new Date()
          }
        ]
      })
      isGenerating.done(false)
      isCollapsed.done(false)
      uiStream.done()
      return
    }

    isCollapsed.done(true)
    let answer = ''
    let toolOutputs: ToolResultPart[] = []
    let errorOccurred = false
    const streamText = createStreamableValue('')

    const answerSection = (
      <Section title="response">
        <BotMessage content={streamText.value} />
      </Section>
    )

    uiStream.update(answerSection)

    while (
      useSpecificAPI
        ? answer.length === 0
        : answer.length === 0 && !errorOccurred
    ) {
      const {
        fullResponse,
        hasError,
        toolResponses
      } = await researcher(
        currentSystemPrompt,
        uiStream,
        streamText,
        messages,
        mapProvider,
        useSpecificAPI
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
      } else {
        // If no tool calls and researcher finished, break to possibly call writer or end
        break
      }
    }

    if (useSpecificAPI && answer.length === 0) {
      const modifiedMessages = (aiState.get().messages as AIMessage[]).map(
        (msg: AIMessage) =>
          msg.role === 'tool'
            ? ({
                ...msg,
                role: 'assistant',
                content: JSON.stringify(msg.content),
                type: 'tool'
              } as AIMessage)
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

    if (!errorOccurred || answer.length > 0) {
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
            type: 'response',
            createdAt: new Date()
          },
          {
            id: groupeId,
            role: 'assistant',
            content: JSON.stringify(relatedQueries),
            type: 'related',
            createdAt: new Date()
          },
          {
            id: groupeId,
            role: 'assistant',
            content: 'followup',
            type: 'followup',
            createdAt: new Date()
          }
        ]
      })
    }
  } catch (error) {
    console.error('Error in processChatWorkflow:', error)
    uiStream.append(
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
        An error occurred while generating the response. Please try again.
      </div>
    )
    aiState.done(aiState.get())
  } finally {
    isGenerating.done(false)
    uiStream.done()
  }
}

async function resubmit(
  messageId: string,
  content: string,
  mapProvider: 'mapbox' | 'google' = 'mapbox'
) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()
  const uiStream = createStreamableUI()
  const isGenerating = createStreamableValue(true)
  const isCollapsed = createStreamableValue(false)

  const messages = aiState.get().messages
  const index = messages.findIndex(m => m.id === messageId)

  if (index === -1) {
    isGenerating.done(false)
    uiStream.done()
    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: null,
      isCollapsed: isCollapsed.value
    }
  }

  const editedMessage = messages[index]
  const chatId = aiState.get().chatId

  if (editedMessage.createdAt) {
    await deleteTrailingMessages(chatId, new Date(editedMessage.createdAt))
  }
  const truncatedMessages = messages.slice(0, index + 1)
  const editedMessageInState = truncatedMessages[index]

  if (Array.isArray(editedMessageInState.content)) {
    const textPart = editedMessageInState.content.find(p => p.type === 'text') as
      | { type: 'text'; text: string }
      | undefined
    if (textPart) {
      textPart.text = content
    }
  } else {
    editedMessageInState.content = content
  }

  await updateMessage(
    messageId,
    typeof editedMessageInState.content === 'object'
      ? JSON.stringify(editedMessageInState.content)
      : editedMessageInState.content
  )

  aiState.update({
    ...aiState.get(),
    messages: truncatedMessages
  })

  const coreMessages: CoreMessage[] = truncatedMessages
    .filter(
      message =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    )
    .map(m => {
      return {
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content
      } as CoreMessage
    })

  const groupeId = nanoid()
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
  const maxMessages = useSpecificAPI ? 5 : 10
  coreMessages.splice(0, Math.max(coreMessages.length - maxMessages, 0))

  const { getCurrentUserIdOnServer } = await import(
    '@/lib/auth/get-current-user'
  )
  const userId = (await getCurrentUserIdOnServer()) || 'anonymous'
  const currentSystemPrompt = (await getSystemPrompt(userId)) || ''

  processChatWorkflow({
    aiState,
    uiStream,
    isGenerating,
    isCollapsed,
    messages: coreMessages,
    groupeId,
    currentSystemPrompt,
    mapProvider,
    useSpecificAPI,
    maxMessages,
    skipTaskManager: true // Usually we want to skip task manager on resubmit
  })

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  }
}

async function deleteMessageAction(messageId: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()
  const messages = aiState.get().messages
  const index = messages.findIndex(m => m.id === messageId)

  if (index !== -1) {
    const messageToDelete = messages[index]
    const chatId = aiState.get().chatId

    if (messageToDelete.createdAt) {
      await deleteTrailingMessages(chatId, new Date(messageToDelete.createdAt))
    }
    await deleteMessage(messageId)

    const truncatedMessages = messages.slice(0, index)
    aiState.done({
      ...aiState.get(),
      messages: truncatedMessages
    })
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
    resubmit,
    deleteMessageAction,
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
                // For backward compatibility with old messages that stored a JSON string
                const json = JSON.parse(content as string)
                messageContent =
                  type === 'input' ? json.input : json.related_query
              } catch (e) {
                // New messages will store the content array or string directly
                messageContent = content
              }
              return {
                id,
                component: (
                  <UserMessage
                    id={id}
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
          const answer = createStreamableValue()
          answer.done(content)
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
              const relatedQueries = createStreamableValue<RelatedQueries>()
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

              return {
                id,
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
