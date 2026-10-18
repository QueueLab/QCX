import { NextResponse } from 'next/server'
import {
  DefaultRequestHandler,
  JsonRpcTransportHandler,
  InMemoryTaskStore,
  AgentEvent,
  RequestContext,
  ExecutionEventBus,
  ServerCallContext
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
      url: '/api/a2a',
      tenant: ''
    }
  ],
  provider: undefined,
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    extensions: []
  },
  securitySchemes: {},
  securityRequirements: [],
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  skills: [],
  signatures: []
}

const taskStore = new InMemoryTaskStore()

const agentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const userMessage = requestContext.userMessage
    let textPart = ''
    if (userMessage.parts) {
      for (const p of userMessage.parts) {
        if (p.content?.$case === 'text') {
          textPart += p.content.value
        }
      }
    }

    eventBus.publish(
      AgentEvent.task({
        id: requestContext.taskId,
        contextId: requestContext.contextId,
        status: {
          state: TaskState.TASK_STATE_WORKING,
          message: undefined,
          timestamp: undefined
        },
        artifacts: [],
        history: [userMessage],
        metadata: undefined
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
            },
            metadata: undefined,
            filename: '',
            mediaType: 'text/plain'
          }
        ],
        metadata: undefined,
        extensions: [],
        referenceTaskIds: []
      })
    )

    eventBus.publish(
      AgentEvent.statusUpdate({
        taskId: requestContext.taskId,
        contextId: requestContext.contextId,
        status: {
          state: TaskState.TASK_STATE_COMPLETED,
          message: undefined,
          timestamp: undefined
        },
        metadata: undefined
      })
    )
  },
  async cancelTask(_taskId: string, _eventBus: ExecutionEventBus) {}
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

    const rpcResult = await jsonRpcHandler.handle(
      body,
      new ServerCallContext({ state: new Map([['headers', headers]]) })
    )

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
