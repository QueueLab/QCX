import { NextResponse } from 'next/server'
import {
  DefaultRequestHandler,
  JsonRpcTransportHandler,
  InMemoryTaskStore,
  AgentEvent,
  RequestContext,
  ExecutionEventBus
} from '@a2a-js/sdk/server'
import { Role, TaskState } from '@a2a-js/sdk'

const agentCard = {
  name: 'QCX-Terra Agent',
  description:
    'Environment-aware planetary computer platform offering geospatial analysis, remote sensing satellite imagery processing, and multi-agent exploration.',
  supportedInterfaces: [
    {
      protocolBinding: 'JSON-RPC',
      protocolVersion: '1.0',
      url: '/api/a2a'
    }
  ],
  capabilities: {
    streaming: true,
    pushNotifications: false
  }
}

const taskStore = new InMemoryTaskStore()

const agentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const userMessage = requestContext.userMessage
    let textPart = ''
    if (userMessage.parts) {
      for (const p of userMessage.parts) {
        if (p.content && typeof p.content === 'object' && 'value' in p.content) {
          textPart += p.content.value
        } else if (p.text) {
          textPart += p.text
        }
      }
    }

    eventBus.publish(
      AgentEvent.task({
        id: requestContext.taskId,
        contextId: requestContext.contextId,
        status: {
          state: TaskState.TASK_STATE_WORKING
        },
        history: [userMessage]
      })
    )

    const responseText = `QCX-Terra Agent received your request: "${textPart}". Processed via A2A Protocol.`

    eventBus.publish(
      AgentEvent.message({
        messageId: `msg-${Date.now()}`,
        taskId: requestContext.taskId,
        contextId: requestContext.contextId,
        role: Role.ROLE_AGENT,
        parts: [
          {
            content: {
              $case: 'text',
              value: responseText
            }
          }
        ]
      })
    )

    eventBus.publish(
      AgentEvent.statusUpdate({
        taskId: requestContext.taskId,
        contextId: requestContext.contextId,
        status: {
          state: TaskState.TASK_STATE_COMPLETED
        }
      })
    )
  }
}

const handler = new DefaultRequestHandler(agentCard, taskStore, agentExecutor)
const jsonRpcHandler = new JsonRpcTransportHandler(handler)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    const rpcResult = await jsonRpcHandler.handle(body, { headers })

    if (rpcResult && typeof (rpcResult as any)[Symbol.asyncIterator] === 'function') {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of rpcResult as AsyncGenerator<any>) {
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
          }
          controller.close()
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    return NextResponse.json(rpcResult, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, A2A-Version'
      }
    })
  } catch (error: any) {
    console.error('A2A Server POST Handler error:', error)
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error?.message || 'Internal error'
        }
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, A2A-Version'
    }
  })
}
