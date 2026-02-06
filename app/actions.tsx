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
import {
  saveChat,
  getSystemPrompt,
  updateMessage,
  deleteMessage,
  deleteTrailingMessages
} from '@/lib/actions/chat'
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
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    const messageId = (formData?.get('id') as string) || nanoid();
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
              content: m.content.filter((part: any) => part.type !== 'image')
            } as CoreMessage
          }
          return m
        })

        const currentMessages = aiState.get().messages;
        const sanitizedHistory = currentMessages.map(m => {
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
              type: 'response',
              createdAt: new Date()
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify({
                ...analysisResult,
                image: dataUrl
              }),
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
  ).map(m => {
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
      const researcherResult = await researcher(
        currentSystemPrompt,
        uiStream,
        streamText,
        messages,
        mapProvider,
        useSpecificAPI
      )
      answer = researcherResult.fullResponse
      toolOutputs = researcherResult.toolResponses
      errorOccurred = researcherResult.hasError

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

    if (answer.length === 0 && !errorOccurred) {
      answer = "I'm sorry, I couldn't generate a response. Please try again."
      streamText.done(answer)
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

const getUIStateFromAIState = (aiState: AIState): UIState => {
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
          const answer = createStreamableValue(content as string)
          answer.done(content as string)

          switch (type) {
            case 'response':
              return {
                id,
                component: <BotMessage content={answer.value} />
              }
            case 'related':
              const relatedQueries = createStreamableValue(
                JSON.parse(content as string)
              )
              relatedQueries.done(JSON.parse(content as string))
              return {
                id,
                component: <SearchRelated relatedQueries={relatedQueries.value} />
              }
            case 'followup':
              return {
                id,
                component: (
                  <Section title="Follow-up" isCollapsed={isSharePage}>
                    <FollowupPanel />
                  </Section>
                )
              }
          }
          break
        case 'tool':
          try {
            const toolResult = JSON.parse(content as string)
            switch (name) {
              case 'search':
                return {
                  id,
                  component: <SearchSection result={toolResult} />,
                  isCollapsed: createStreamableValue(true).value
                }
              case 'retrieve':
                return {
                  id,
                  component: <RetrieveSection data={toolResult} />,
                  isCollapsed: createStreamableValue(true).value
                }
              case 'videoSearch':
                return {
                  id,
                  component: <VideoSearchSection result={toolResult} />,
                  isCollapsed: createStreamableValue(true).value
                }
            }
          } catch (e) {
            return null
          }
          break
      }
      return null
    })
    .filter(message => message !== null) as UIState
}

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
    resubmit,
    deleteMessageAction,
    clearChat
  },
  initialUIState,
  initialAIState,
  unmaskRequiredConfigs: true,
  onGetUIState: getUIStateFromAIState
})
