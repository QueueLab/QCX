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
import { inquire, researcher, taskManager, querySuggestor, resolutionSearch } from '@/lib/agents'
// Removed import of useGeospatialToolMcp as it no longer exists and was incorrectly used here.
// The geospatialTool (if used by agents like researcher) now manages its own MCP client.
import { writer } from '@/lib/agents/writer'
import { saveChat, getSystemPrompt } from '@/lib/actions/chat' // Added getSystemPrompt
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { retrieveContext } from '@/lib/actions/rag'
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
        message.type !== 'end'
    );

    // The user's prompt for this action is static.
    const userInput = 'Analyze this map view.';

    // Construct the multimodal content for the user message.
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    // Add the new user message to the AI state.
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content: JSON.stringify(content) }
      ]
    });
    messages.push({ role: 'user', content });

    // Call the simplified agent, which now returns data directly.
    const analysisResult = await resolutionSearch(messages) as any;

    // Create a streamable value for the summary and mark it as done.
    const summaryStream = createStreamableValue<string>();
    summaryStream.done(analysisResult.summary || 'Analysis complete.');

    // Update the UI stream with the BotMessage component.
    uiStream.update(
      <BotMessage content={summaryStream.value} />
    );

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
                type: 'response'
            },
            {
                id: groupeId,
                role: 'assistant',
                content: JSON.stringify(analysisResult),
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

    isGenerating.done(false);
    uiStream.done();
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
      message.type !== 'end'
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

    uiStream.append(answerSection);

    const groupeId = nanoid();
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

  if (content) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content: typeof content === 'string' ? content : JSON.stringify(content),
          type
        }
      ]
    })
    messages.push({
      role: 'user',
      content
    } as CoreMessage)
  }

  const userId = (await getCurrentUserIdOnServer()) || 'anonymous'
  const currentSystemPrompt = (await getSystemPrompt(userId)) || ''

  const retrievedContext = userInput
    ? await retrieveContext(userInput, aiState.get().chatId)
    : []
  const augmentedSystemPrompt = retrievedContext.length > 0
    ? `Context: ${retrievedContext.join('\n')}\n${currentSystemPrompt}`
    : currentSystemPrompt
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
        augmentedSystemPrompt,
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
    } else {
      aiState.done(aiState.get())
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

export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'data'
  content: string | any[]
  name?: string
  type?:
    | 'response'
    | 'inquiry'
    | 'related'
    | 'followup'
    | 'input'
    | 'input_related'
    | 'tool'
    | 'resolution_search_result'
    | 'skip'
    | 'end'
    | 'drawing_context'
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  component: React.ReactNode
  isGenerating?: StreamableValue<boolean>
  isCollapsed?: StreamableValue<boolean>
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
    clearChat
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const aiState = getAIState()

    if (aiState) {
      const uiState = getUIStateFromAIState(aiState as Chat)
      return uiState
    } else {
      return
    }
  },
  onSetAIState: async ({ state, done }) => {
    'use server'

    const { chatId, messages } = state

    const userId = (await getCurrentUserIdOnServer()) || 'anonymous'

    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && done) {
      const chat: Chat = {
        id: chatId,
        title: typeof messages[0].content === 'string' 
          ? messages[0].content.substring(0, 100) 
          : 'New Chat',
        userId,
        createdAt: new Date(),
        messages: messages as any, // Cast to any to avoid type conflict with Chat interface
        path: `/search/${chatId}`
      }

      await saveChat(chat, userId)
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  const chatId = aiState.id
  const isSharePage = false // Defaulting to false as it's not defined

  const messages = aiState.messages
    .filter(
      message =>
        message.role !== 'system' &&
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related'
    )
    .map((message, index) => {
      const { role, content, id, type } = message

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
                const parsed = JSON.parse(content as string)
                if (Array.isArray(parsed)) {
                  messageContent = parsed
                } else if (typeof parsed === 'object' && parsed !== null) {
                  messageContent = type === 'input' ? parsed.input : parsed.related_query
                } else {
                  messageContent = parsed
                }
              } catch (e) {
                // New messages will store the content array or string directly
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
          switch (type) {
            case 'response':
              const answer = createStreamableValue()
              answer.done(content)
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
              let analysisResult: any = {}
              try {
                analysisResult = JSON.parse(content as string);
              } catch (e) {
                // Not JSON
              }
              const geoJson = analysisResult.geoJson as FeatureCollection;
              const summaryStream = createStreamableValue<string>()
              summaryStream.done(analysisResult.summary || 'Analysis complete.')

              return {
                id,
                component: (
                  <>
                     <BotMessage content={summaryStream.value} />
                    {geoJson && (
                      <GeoJsonLayer id={id} data={geoJson} />
                    )}
                  </>
                )
              }
            }
            default: {
               // Handle generic assistant messages that might not have a specific type or are 'answer' type
               // Handle content that is not a string (e.g., array of parts)
                let displayContent: string = ''
                if (typeof content === 'string') {
                    displayContent = content
                } else if (Array.isArray(content)) {
                    // Convert array content to string representation or extract text
                    displayContent = content.map(part => {
                        if ('text' in part) return part.text
                        return ''
                    }).join('\n')
                }
                
                const contentStream = createStreamableValue<string>()
                contentStream.done(displayContent)

                return {
                  id,
                  component: <BotMessage content={contentStream.value} />
                }
            }
          }
          break
        default:
          return null
      }
    })
    .filter(message => message !== null) as UIState

  return messages
}
