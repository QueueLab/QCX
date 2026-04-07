import { NextRequest, NextResponse } from 'next/server'
import { CoreMessage } from 'ai'
import { nanoid } from '@/lib/utils'
import { taskManager, inquire, researcher, writer, querySuggestor, resolutionSearch, type DrawnFeature } from '@/lib/agents'
import { getSystemPrompt } from '@/lib/actions/chat'

// Limit concurrent requests to avoid overwhelming the AI API
let isProcessing = false

export async function POST(req: NextRequest) {
  try {
    if (isProcessing) {
      return NextResponse.json(
        { error: 'Another request is already in progress' },
        { status: 429 }
      )
    }

    isProcessing = true

    // Parse based on content-type
    const contentType = req.headers.get('content-type') || ''
    let action = ''
    let extraBody: any = {}
    let messages: CoreMessage[] = []
    let file: File | undefined
    let fileMapbox: File | undefined
    let fileGoogle: File | undefined
    let timezone = 'UTC'
    let location: { lat: number; lng: number } | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      action = formData.get('action') as string
      const input = formData.get('input') as string
      const drawnFeaturesStr = formData.get('drawnFeatures') as string
      extraBody = {
        drawnFeatures: drawnFeaturesStr,
        mapProvider: formData.get('mapProvider') as string || 'mapbox',
        chatId: formData.get('chatId') as string
      }
      
      file = formData.get('file') as File
      fileMapbox = formData.get('file_mapbox') as File
      fileGoogle = formData.get('file_google') as File
      timezone = formData.get('timezone') as string || 'UTC'
      
      const lat = formData.get('latitude')
      const lng = formData.get('longitude')
      if (lat && lng) {
        location = { lat: parseFloat(lat as string), lng: parseFloat(lng as string) }
      }
      
      if (input) {
        messages = [{ role: 'user', content: input }]
      }
    } else {
      // JSON body
      try {
        const body = await req.json() as any
        messages = (body.messages || []) as CoreMessage[]
        extraBody = body.extraBody || {}
      } catch (e) {
        isProcessing = false
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
      }
    }

    // Extract extras
    let drawnFeatures: DrawnFeature[] = []
    let mapProvider = extraBody.mapProvider || 'mapbox'
    let chatId = extraBody.chatId || nanoid()

    if (extraBody.drawnFeatures) {
      try {
        drawnFeatures = typeof extraBody.drawnFeatures === 'string' 
          ? JSON.parse(extraBody.drawnFeatures) 
          : extraBody.drawnFeatures
      } catch (e) {}
    }

    // ====== RESOLUTION SEARCH (Image Upload) ======
    if (action === 'resolution_search' || file || fileMapbox || fileGoogle) {
      const imageFile = file || fileMapbox || fileGoogle
      if (!imageFile) {
        isProcessing = false
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const groupeId = nanoid()
      
      // Convert to data URL
      const mapboxBuffer = fileMapbox ? await fileMapbox.arrayBuffer() : null
      const mapboxDataUrl = mapboxBuffer && fileMapbox ? `data:${fileMapbox.type};base64,${Buffer.from(mapboxBuffer).toString('base64')}` : null
      
      const googleBuffer = fileGoogle ? await fileGoogle.arrayBuffer() : null
      const googleDataUrl = googleBuffer && fileGoogle ? `data:${fileGoogle.type};base64,${Buffer.from(googleBuffer).toString('base64')}` : null
      
      const buffer = await imageFile.arrayBuffer()
      const dataUrl = `data:${imageFile.type};base64,${Buffer.from(buffer).toString('base64')}`

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', chatId, messageId: groupeId })}\n\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'summary', content: 'Analyzing map view...' })}\n\n`))

            const streamResult = await resolutionSearch(messages, timezone, drawnFeatures, location)

            let fullSummary = ''
            for await (const partialObject of streamResult.partialObjectStream) {
              if (partialObject.summary) {
                fullSummary = partialObject.summary
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'summary', content: fullSummary })}\n\n`))
              }
            }

            const analysisResult = await streamResult.object
            fullSummary = analysisResult.summary || 'Analysis complete.'

            // Send response
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'message', 
              message: { id: groupeId, role: 'assistant', content: fullSummary }
            })}\n\n`))

            // Send related queries
            const relatedQueries = { items: [] }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'message', 
              message: { id: `${groupeId}-related`, role: 'assistant', content: JSON.stringify(relatedQueries), type: 'related' }
            })}\n\n`))

            // Send follow-up
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'message', 
              message: { id: `${groupeId}-followup`, role: 'assistant', content: 'followup', type: 'followup' }
            })}\n\n`))

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            controller.close()
          } catch (error) {
            console.error('Error in resolution search:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`))
            controller.close()
          } finally {
            isProcessing = false
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ====== REGULAR CHAT ======
    // Get user input from last message
    const lastMessage = messages[messages.length - 1]
    let userInput = ''
    
    if (typeof lastMessage?.content === 'string') {
      userInput = lastMessage.content
    } else if (Array.isArray(lastMessage?.content)) {
      const textPart = lastMessage.content.find((p: any) => p.type === 'text') as any
      userInput = textPart?.text || ''
    }

    // Handle FAQ questions
    if (userInput && (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?')) {
      const definition = userInput.toLowerCase().trim() === 'what is a planet computer?'
        ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`
        : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing] (https://www.queue.cx/#pricing)`

      const groupeId = nanoid()
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', chatId, messageId: groupeId })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'message', message: { id: groupeId, role: 'assistant', content: definition } })}\n\n`))
          
          // Related queries
          const relatedQueries = { items: [] }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'message', 
            message: { id: `${groupeId}-related`, role: 'assistant', content: JSON.stringify(relatedQueries), type: 'related' }
          })}\n\n`))
          
          // Follow-up
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'message', 
            message: { id: `${groupeId}-followup`, role: 'assistant', content: 'followup', type: 'followup' }
          })}\n\n`))
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
          isProcessing = false
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    if (!userInput) {
      isProcessing = false
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }

    // Clean messages for AI processing
    const cleanedMessages = messages.filter(m => m.role !== 'system')
    const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
    const maxMessages = useSpecificAPI ? 5 : 10
    if (cleanedMessages.length > maxMessages) {
      cleanedMessages.splice(0, cleanedMessages.length - maxMessages)
    }

    const userId = 'anonymous'
    const currentSystemPrompt = (await getSystemPrompt(userId)) || ''
    const groupeId = nanoid()

    // Streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', chatId, messageId: groupeId })}\n\n`))

          // Task manager
          let taskAction = { object: { next: 'proceed' } }
          try {
            const taskManagerResult = await taskManager(cleanedMessages)
            if (taskManagerResult?.object) {
              taskAction = taskManagerResult
            }
          } catch (e) {
            console.error('Error in taskManager:', e)
          }

          // Handle inquiry
          if (taskAction?.object?.next === 'inquire') {
            let question = 'Can you provide more details?'
            try {
              const inquiryResult = await inquire(cleanedMessages)
              question = inquiryResult?.question || question
            } catch (e) {}
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'message', message: { id: groupeId, role: 'user', content: question } })}\n\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            controller.close()
            return
          }

          // Research
          let answer = ''
          let toolOutputs: any[] = []
          
          try {
            const { fullResponse, toolResponses } = await researcher(
              currentSystemPrompt,
              cleanedMessages,
              mapProvider,
              useSpecificAPI,
              drawnFeatures
            )
            answer = fullResponse
            toolOutputs = toolResponses || []

            for (const output of toolOutputs) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'tool', 
                toolName: output.toolName, 
                result: output.result 
              })}\n\n`))
            }
          } catch (e) {
            console.error('Error in researcher:', e)
            answer = 'I encountered an error while processing your request. Please try again.'
          }

          // Writer if needed
          if ((!answer || answer.length === 0) && useSpecificAPI) {
            try {
              const modifiedMessages = cleanedMessages.map(msg =>
                msg.role === 'tool'
                  ? { ...msg, role: 'assistant', content: JSON.stringify(msg.content) }
                  : msg
              )
              const latestMessages = modifiedMessages.slice(maxMessages * -1)
              answer = await writer(currentSystemPrompt, latestMessages)
            } catch (e) {}
          }

          // Stream main response
          if (answer) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'message', 
              message: { id: groupeId, role: 'assistant', content: answer }
            })}\n\n`))
          }

          // ====== RELATED QUERIES ======
          let relatedQueries = { items: [] }
          try {
            relatedQueries = await querySuggestor(null, cleanedMessages) || { items: [] }
          } catch (e) {
            console.error('Error in querySuggestor:', e)
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'message', 
            message: { id: `${groupeId}-related`, role: 'assistant', content: JSON.stringify(relatedQueries), type: 'related' }
          })}\n\n`))

          // ====== FOLLOW-UP ======
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'message', 
            message: { id: `${groupeId}-followup`, role: 'assistant', content: 'followup', type: 'followup' }
          })}\n\n`))

          // Done
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        } catch (error) {
          console.error('Error in chat processing:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`))
          controller.close()
        } finally {
          isProcessing = false
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    isProcessing = false
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}