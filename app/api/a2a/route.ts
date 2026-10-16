import { buildAgentCard } from '@/lib/a2a/agent-card'
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

const MAX_REQUEST_BYTES = 1024 * 1024
const cardBaseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
  : 'http://localhost:3000'
const agentCard = buildAgentCard(cardBaseUrl)
const taskStore = new InMemoryTaskStore()

const agentExecutor = {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus) {
    const userMessage = requestContext.userMessage
    let textPart = ''
    if (userMessage.parts) {
      for (const part of userMessage.parts) {
        if (part.content?.$case === 'text') textPart += part.content.value
      }
    }

    eventBus.publish(AgentEvent.task({
      id: requestContext.taskId,
      contextId: requestContext.contextId,
      status: { state: TaskState.TASK_STATE_WORKING, message: undefined, timestamp: new Date().toISOString() },
      history: [userMessage],
      artifacts: [],
      metadata: undefined
    }))
    const responseText = `QCX-Terra Agent received your request: "${textPart}". Processed via A2A Protocol.`
    eventBus.publish(AgentEvent.message({
      messageId: `msg-${Date.now()}`,
      taskId: requestContext.taskId,
      contextId: requestContext.contextId,
      role: Role.ROLE_AGENT,
      parts: [{ content: { $case: 'text', value: responseText }, metadata: undefined, filename: '', mediaType: 'text/plain' }],
      metadata: undefined,
      extensions: [],
      referenceTaskIds: []
    }))
    eventBus.publish(AgentEvent.statusUpdate({
      taskId: requestContext.taskId,
      contextId: requestContext.contextId,
      status: { state: TaskState.TASK_STATE_COMPLETED, message: undefined, timestamp: new Date().toISOString() },
      metadata: undefined
    }))
  },
  async cancelTask() {}
}

const handler = new DefaultRequestHandler(agentCard, taskStore, agentExecutor)
const jsonRpcHandler = new JsonRpcTransportHandler(handler)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, A2A-Version'
}

/** Read and parse a JSON request while enforcing the maximum body size. */
async function readBoundedJson(request: Request) {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new RangeError('Request body too large')
  }
  if (!request.body) throw new SyntaxError('Request body is required')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel()
        throw new RangeError('Request body too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(body))
}

/** Enforce bearer authentication when a server token is configured. */
function isAuthorized(request: Request) {
  const expectedToken = process.env.A2A_SERVER_API_KEY
  if (!expectedToken) return true // Public by default; set A2A_SERVER_API_KEY to require bearer auth.
  return request.headers.get('authorization') === `Bearer ${expectedToken}`
}

/** Process one bounded, optionally authenticated A2A JSON-RPC request. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
      { status: 401, headers: corsHeaders }
    )
  }

  try {
    const body = await readBoundedJson(request)
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => { headers[key] = value })
    const context = new ServerCallContext({ state: new Map([['headers', headers]]) })
    const rpcResult = await jsonRpcHandler.handle(body, context)

    if (rpcResult && typeof (rpcResult as any)[Symbol.asyncIterator] === 'function') {
      const generator = rpcResult as AsyncGenerator<any>
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`))
            }
            controller.close()
          } catch (error) {
            console.error('A2A response stream failed:', error)
            controller.error(error)
          }
        },
        async cancel() {
          await generator.return?.(undefined)
        }
      })
      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' }
      })
    }

    return Response.json(rpcResult, { headers: corsHeaders })
  } catch (error) {
    if (error instanceof RangeError) {
      return Response.json(
        { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request body exceeds the 1 MiB limit' } },
        { status: 413, headers: corsHeaders }
      )
    }
    console.error('A2A Server POST Handler error:', error)
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } },
      { status: 500, headers: corsHeaders }
    )
  }
}

/** Answer preflight requests for the public A2A JSON-RPC endpoint. */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}
