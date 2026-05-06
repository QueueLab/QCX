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

const streamHeaders = {
  'Content-Type': 'text/plain; charset=utf-8',
  'x-vercel-ai-data-stream': 'v1',
}

export async function POST(request: Request) {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
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

  // Capture the original first user message before trimming so chat title stays stable.
  const originalFirstUserMessage = (clientMessages || []).find((m: any) => m.role === 'user')

  // Build core messages from client messages
  const messages: CoreMessage[] = (clientMessages || [])
    .filter((m: any) => m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
    .map((m: any) => ({
      role: m.role,
      content: m.content,
      // preserve assistant tool calls so the model doesn't re-issue them
      ...(m.toolInvocations ? { toolInvocations: m.toolInvocations } : {}),
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
      ? `A planet computer is a proprietary environment aware system that interoperates Climate forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`
      : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`;

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(definition)}\n`))
        controller.enqueue(encoder.encode(`2:[{"relatedQueries":{"items":[]},"type":"related"}]\n`))
        const usage = { promptTokens: 0, completionTokens: 0 }
        controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":${JSON.stringify(usage)}}\n`))
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":${JSON.stringify(usage)}}\n`))
        controller.close()
      }
    })

    saveChatAsync(chatId, userId, messages, definition)

    return new Response(stream, {
      headers: streamHeaders
    })
  }

  // Task manager: decide inquire vs proceed
  let nextAction = 'proceed'
  let taskManagerUsage = { promptTokens: 0, completionTokens: 0 }
  try {
    const taskResult = await taskManager(messages)
    if (taskResult?.usage) {
      taskManagerUsage = taskResult.usage
    }
    if (taskResult?.object?.next === 'inquire') {
      nextAction = 'inquire'
    }
  } catch (e) {
    console.error('Task manager error:', e)
  }

  // Inquiry path
  if (nextAction === 'inquire') {
    const { object: inquiryResult, usage: inquiryUsage } = await inquire(messages)
    const totalInquiryUsage = {
      promptTokens: taskManagerUsage.promptTokens + (inquiryUsage?.promptTokens || 0),
      completionTokens: taskManagerUsage.completionTokens + (inquiryUsage?.completionTokens || 0)
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send inquiry data as a data annotation
        const annotation = { type: 'inquiry', data: inquiryResult }
        controller.enqueue(encoder.encode(`2:[${JSON.stringify(annotation)}]\n`))
        controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":${JSON.stringify(totalInquiryUsage)}}\n`))
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":${JSON.stringify(totalInquiryUsage)}}\n`))
        controller.close()
      }
    })
    return new Response(stream, {
      headers: streamHeaders
    })
  }

  // Proceed path: researcher -> optionally writer -> query suggestor
  let answer = ''
  let toolOutputs: ToolResultPart[] = []
  let errorOccurred = false
  const allToolOutputs: ToolResultPart[] = []
  const maxAttempts = 3
  let attempts = 0
  let totalUsage = { promptTokens: 0, completionTokens: 0 }

  while (
    attempts < maxAttempts &&
    (useSpecificAPI
      ? answer.length === 0
      : answer.length === 0 && !errorOccurred)
  ) {
    attempts++
    const { fullResponse, hasError, toolResponses, newSegments, usage } = await researcher(
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
    if (usage) {
      totalUsage.promptTokens += usage.promptTokens
      totalUsage.completionTokens += usage.completionTokens
    }
    // Only append segments to messages on success or final attempt
    if (answer.length > 0 || errorOccurred || attempts >= maxAttempts) {
      messages.push(...newSegments)
    }
  }

  // Always fall back to writer if researcher produced no text
  if (answer.length === 0) {
    const latestMessages = messages.slice(maxMsgs * -1)
    const writerResult = await writer(currentSystemPrompt, latestMessages)
    answer = writerResult.fullResponse
    if (writerResult.usage) {
      totalUsage.promptTokens += writerResult.usage.promptTokens
      totalUsage.completionTokens += writerResult.usage.completionTokens
    }
  }

  // Get related queries (sanitize to remove image parts)
  let relatedQueries = {}
  if (!errorOccurred) {
    const sanitizedMessages: CoreMessage[] = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        return { ...m, content: m.content.filter((part: any) => part.type !== 'image') } as CoreMessage
      }
      return m
    })
    const suggestorResult = await querySuggestor(sanitizedMessages)
    relatedQueries = suggestorResult.relatedQueries
    if (suggestorResult.usage) {
      totalUsage.promptTokens += suggestorResult.usage.promptTokens
      totalUsage.completionTokens += suggestorResult.usage.completionTokens
    }
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
        controller.enqueue(encoder.encode(`2:[${JSON.stringify(annotation)}]\n`))
      }

      // Stream the text response
      if (answer) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(answer)}\n`))
      }

      // Send related queries as annotation
      const relatedAnnotation = { type: 'related', relatedQueries }
      controller.enqueue(encoder.encode(`2:[${JSON.stringify(relatedAnnotation)}]\n`))

      // Finish
      controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":${JSON.stringify(totalUsage)}}\n`))
      controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":${JSON.stringify(totalUsage)}}\n`))
      controller.close()
    }
  })

  // Save chat asynchronously
  saveChatAsync(chatId, userId, messages, answer, allToolOutputs, relatedQueries, originalFirstUserMessage)

  return new Response(stream, {
    headers: streamHeaders
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
  // Capture original first user message
  const originalFirstUserMessage = messages.find(m => m.role === 'user')

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
    const analysisUsage = await streamResult.usage

    // Get related queries
    const sanitizedMessages: CoreMessage[] = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        return { ...m, content: m.content.filter((part: any) => part.type !== 'image') } as CoreMessage
      }
      return m
    })
    const { relatedQueries, usage: relatedUsage } = await querySuggestor(sanitizedMessages)

    const totalResUsage = {
      promptTokens: (analysisUsage?.promptTokens || 0) + (relatedUsage?.promptTokens || 0),
      completionTokens: (analysisUsage?.completionTokens || 0) + (relatedUsage?.completionTokens || 0)
    }

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
        controller.enqueue(encoder.encode(`2:[${JSON.stringify(resAnnotation)}]\n`))

        // Stream summary text
        if (analysisResult.summary) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(analysisResult.summary)}\n`))
        }

        // Related queries
        const relatedAnnotation = { type: 'related', relatedQueries }
        controller.enqueue(encoder.encode(`2:[${JSON.stringify(relatedAnnotation)}]\n`))

        controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":${JSON.stringify(totalResUsage)}}\n`))
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":${JSON.stringify(totalResUsage)}}\n`))
        controller.close()
      }
    })

    saveChatAsync(chatId, userId, messages, analysisResult.summary || '', undefined, relatedQueries, originalFirstUserMessage)

    return new Response(stream, {
      headers: streamHeaders
    })
  } catch (error) {
    console.error('Resolution search error:', error)
    return new Response(JSON.stringify({ error: 'Resolution search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function saveChatAsync(
  chatId: string,
  userId: string,
  messages: CoreMessage[],
  answer: string,
  toolOutputs?: ToolResultPart[],
  relatedQueries?: any,
  originalFirstUserMessage?: any
) {
  try {
    let title = 'Untitled Chat'
    const firstMsg = originalFirstUserMessage || messages[0]
    if (firstMsg) {
      if (typeof firstMsg.content === 'string') {
        title = firstMsg.content.substring(0, 100)
      } else if (Array.isArray(firstMsg.content)) {
        const textPart = (firstMsg.content as any[]).find((p: any) => p.type === 'text')
        title = textPart?.text?.substring(0, 100) || 'Image Message'
      }
    }

    const aiMessages: AIMessage[] = []

    for (const msg of messages) {
      let content: CoreMessage['content'] = msg.content
      if (Array.isArray(content)) {
        content = (content as any[]).filter((part: any) => part.type !== 'image') as CoreMessage['content']
      }
      aiMessages.push({
        id: (msg as any).id || nanoid(),
        role: msg.role as AIMessage['role'],
        content,
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
