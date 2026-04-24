import { CoreMessage, ToolResultPart, streamText, LanguageModel } from 'ai'
import { nanoid } from '@/lib/utils'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { taskManager, inquire, querySuggestor } from '@/lib/agents'
import { researcher } from '@/lib/agents/researcher'
import { writer } from '@/lib/agents/writer'
import { resolutionSearch, type DrawnFeature } from '@/lib/agents/resolution-search'
import { getModel } from '@/lib/utils'
import { getSystemPrompt, saveChat } from '@/lib/actions/chat'
import type { Chat, AIMessage } from '@/lib/types'
import type { MapProvider } from '@/lib/store/settings'

export const maxDuration = 60

export async function POST(request: Request) {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json()
  const {
    messages: clientMessages,
    chatId = nanoid(),
    action,
    mapProvider = 'mapbox',
    drawnFeatures: drawnFeaturesRaw,
    timezone,
    latitude,
    longitude,
    fileData,
    mapboxImageData,
    googleImageData,
  } = body

  const drawnFeatures: DrawnFeature[] = drawnFeaturesRaw || []
  const location = (latitude !== undefined && longitude !== undefined)
    ? { lat: parseFloat(latitude), lng: parseFloat(longitude) }
    : undefined

  const currentSystemPrompt = (await getSystemPrompt(userId)) || ''
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
  const maxMsgs = useSpecificAPI ? 5 : 10

  // Build core messages from client messages
  const messages: CoreMessage[] = (clientMessages || [])
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => ({
      role: m.role,
      content: m.content
    }))

  // Trim to max messages
  if (messages.length > maxMsgs) {
    messages.splice(0, messages.length - maxMsgs)
  }

  // Resolution search action
  if (action === 'resolution_search' && fileData) {
    return handleResolutionSearch({
      messages, chatId, userId, fileData, mapboxImageData, googleImageData,
      timezone, drawnFeatures, location
    })
  }

  // Hardcoded responses
  const lastMsg = messages[messages.length - 1]
  const lastText = typeof lastMsg?.content === 'string' ? lastMsg.content.trim().toLowerCase() : ''
  if (lastText === 'what is a planet computer?' || lastText === 'what is qcx-terra?') {
    const definition = lastText === 'what is a planet computer?'
      ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`
      : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`;

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send text content
        controller.enqueue(encoder.encode(`0:${JSON.stringify(definition)}\n`))
        // Send finish message
        controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`))
        // Send data with metadata
        controller.enqueue(encoder.encode(`2:[{"relatedQueries":{"items":[]},"type":"related"}]\n`))
        controller.close()
      }
    })

    saveChatAsync(chatId, userId, messages, definition)

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }

  // Task manager: decide inquire vs proceed
  let nextAction = 'proceed'
  try {
    const taskResult = await taskManager(messages)
    if (taskResult?.object?.next === 'inquire') {
      nextAction = 'inquire'
    }
  } catch (e) {
    console.error('Task manager error:', e)
  }

  // Inquiry path
  if (nextAction === 'inquire') {
    const inquiryResult = await inquire(messages)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send inquiry data as a data annotation
        const annotation = { type: 'inquiry', data: inquiryResult }
        controller.enqueue(encoder.encode(`8:[${JSON.stringify(annotation)}]\n`))
        controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`))
        controller.close()
      }
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }

  // Proceed path: researcher -> optionally writer -> query suggestor
  let answer = ''
  let toolOutputs: ToolResultPart[] = []
  let errorOccurred = false
  const allToolOutputs: ToolResultPart[] = []

  while (
    useSpecificAPI
      ? answer.length === 0
      : answer.length === 0 && !errorOccurred
  ) {
    const { fullResponse, hasError, toolResponses } = await researcher(
      currentSystemPrompt,
      messages,
      mapProvider as MapProvider,
      useSpecificAPI,
      drawnFeatures
    )
    answer = fullResponse
    toolOutputs = toolResponses
    errorOccurred = hasError
    allToolOutputs.push(...toolResponses)
  }

  if (useSpecificAPI && answer.length === 0) {
    const latestMessages = messages.slice(maxMsgs * -1)
    answer = await writer(currentSystemPrompt, latestMessages)
  }

  // Get related queries
  let relatedQueries = {}
  if (!errorOccurred) {
    relatedQueries = await querySuggestor(messages)
  }

  // Build streaming response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send tool results as annotations
      for (const toolResult of allToolOutputs) {
        const annotation = {
          type: 'tool_result',
          toolName: toolResult.toolName,
          result: toolResult.result
        }
        controller.enqueue(encoder.encode(`8:[${JSON.stringify(annotation)}]\n`))
      }

      // Stream the text response
      if (answer) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(answer)}\n`))
      }

      // Send related queries as annotation
      const relatedAnnotation = { type: 'related', relatedQueries }
      controller.enqueue(encoder.encode(`8:[${JSON.stringify(relatedAnnotation)}]\n`))

      // Finish
      controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`))
      controller.close()
    }
  })

  // Save chat asynchronously
  saveChatAsync(chatId, userId, messages, answer, allToolOutputs, relatedQueries)

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}

async function handleResolutionSearch({
  messages, chatId, userId, fileData, mapboxImageData, googleImageData,
  timezone, drawnFeatures, location
}: {
  messages: CoreMessage[]
  chatId: string
  userId: string
  fileData: string
  mapboxImageData?: string
  googleImageData?: string
  timezone?: string
  drawnFeatures: DrawnFeature[]
  location?: { lat: number; lng: number }
}) {
  const content: CoreMessage['content'] = [
    { type: 'text', text: 'Analyze this map view.' },
    { type: 'image', image: fileData, mimeType: 'image/png' }
  ]
  messages.push({ role: 'user', content })

  try {
    const streamResult = await resolutionSearch(
      messages,
      timezone || 'UTC',
      drawnFeatures,
      location
    )

    const analysisResult = await streamResult.object

    // Get related queries
    const sanitizedMessages: CoreMessage[] = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        return { ...m, content: m.content.filter((part: any) => part.type !== 'image') } as CoreMessage
      }
      return m
    })
    const relatedQueries = await querySuggestor(sanitizedMessages)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send resolution result as annotation
        const resAnnotation = {
          type: 'resolution_search_result',
          data: {
            ...analysisResult,
            image: fileData,
            mapboxImage: mapboxImageData,
            googleImage: googleImageData
          }
        }
        controller.enqueue(encoder.encode(`8:[${JSON.stringify(resAnnotation)}]\n`))

        // Stream summary text
        if (analysisResult.summary) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(analysisResult.summary)}\n`))
        }

        // Related queries
        const relatedAnnotation = { type: 'related', relatedQueries }
        controller.enqueue(encoder.encode(`8:[${JSON.stringify(relatedAnnotation)}]\n`))

        controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`))
        controller.close()
      }
    })

    saveChatAsync(chatId, userId, messages, analysisResult.summary || '')

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  } catch (error) {
    console.error('Resolution search error:', error)
    return new Response(JSON.stringify({ error: 'Resolution search failed' }), { status: 500 })
  }
}

async function saveChatAsync(
  chatId: string,
  userId: string,
  messages: CoreMessage[],
  answer: string,
  toolOutputs?: ToolResultPart[],
  relatedQueries?: any
) {
  try {
    let title = 'Untitled Chat'
    const firstMsg = messages[0]
    if (firstMsg) {
      if (typeof firstMsg.content === 'string') {
        title = firstMsg.content.substring(0, 100)
      } else if (Array.isArray(firstMsg.content)) {
        const textPart = (firstMsg.content as any[]).find(p => p.type === 'text')
        title = textPart?.text?.substring(0, 100) || 'Image Message'
      }
    }

    const aiMessages: AIMessage[] = []

    // Add user messages
    for (const msg of messages) {
      aiMessages.push({
        id: nanoid(),
        role: msg.role as AIMessage['role'],
        content: msg.content,
        type: msg.role === 'user' ? 'input' : undefined
      })
    }

    // Add tool outputs
    if (toolOutputs) {
      for (const tool of toolOutputs) {
        aiMessages.push({
          id: nanoid(),
          role: 'tool',
          content: JSON.stringify(tool.result),
          name: tool.toolName,
          type: 'tool'
        })
      }
    }

    // Add response
    if (answer) {
      aiMessages.push({
        id: nanoid(),
        role: 'assistant',
        content: answer,
        type: 'response'
      })
    }

    // Add related queries
    if (relatedQueries) {
      aiMessages.push({
        id: nanoid(),
        role: 'assistant',
        content: JSON.stringify(relatedQueries),
        type: 'related'
      })
    }

    // Add end marker
    aiMessages.push({
      id: nanoid(),
      role: 'assistant',
      content: 'end',
      type: 'end'
    })

    const chat: Chat = {
      id: chatId,
      createdAt: new Date(),
      userId,
      path: `/search/${chatId}`,
      title,
      messages: aiMessages
    }
    await saveChat(chat, userId)
  } catch (error) {
    console.error('Error saving chat:', error)
  }
}
