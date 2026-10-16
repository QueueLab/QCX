import { test, expect } from 'bun:test'

const { a2aSchema } = await import('../lib/schema/a2a')
const { GET: getAgentCard } = await import('../app/.well-known/agent-card.json/route')
const { POST: handleA2aPost } = await import('../app/api/a2a/route')
const { a2aTool } = await import('../lib/agents/tools/a2a')

test('A2A Zod schema validation', () => {
  const validSchemaInput = {
    message: 'Query weather agent',
    targetAgent: 'weather-agent',
    parameters: JSON.stringify({ location: 'Oregon' })
  }
  const parsedSchema = a2aSchema.parse(validSchemaInput)
  expect(parsedSchema.message).toBe(validSchemaInput.message)
  expect(parsedSchema.targetAgent).toBe(validSchemaInput.targetAgent)
})

test('Agent Card discovery endpoint (.well-known/agent-card.json)', async () => {
  const cardReq = new Request('http://localhost:3000/.well-known/agent-card.json', {
    headers: {
      host: 'localhost:3000',
      'x-forwarded-proto': 'http'
    }
  })
  const cardRes = await getAgentCard(cardReq)
  const cardData = await cardRes.json()

  expect(cardData.name).toBe('QCX-Terra Agent')
  expect(Array.isArray(cardData.supportedInterfaces)).toBe(true)
  expect(cardData.supportedInterfaces.length).toBeGreaterThan(0)
  expect(cardData.supportedInterfaces.map((item: any) => item.protocolBinding)).toEqual(['JSONRPC'])
  expect(cardData.skills.length).toBeGreaterThan(0)
})

test('A2A Server POST route SendMessage handling', async () => {
  const rpcMessageReq = new Request('http://localhost:3000/api/a2a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 101,
      method: 'SendMessage',
      params: {
        message: {
          messageId: 'msg-test-01',
          role: 'ROLE_USER',
          parts: [{ content: { $case: 'text', value: 'Hello QCX Agent' } }]
        }
      }
    })
  })

  const rpcRes = await handleA2aPost(rpcMessageReq)
  const rpcData = await rpcRes.json()

  expect(rpcData.jsonrpc).toBe('2.0')
  expect(rpcData.id).toBe(101)
  expect(rpcData.result).toBeDefined()
})

test('A2A Server invalid method error handling', async () => {
  const invalidRpcReq = new Request('http://localhost:3000/api/a2a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 102,
      method: 'InvalidMethodName',
      params: {}
    })
  })

  const invalidRes = await handleA2aPost(invalidRpcReq)
  const invalidData = await invalidRes.json()

  expect(invalidData.error).toBeDefined()
  expect(invalidData.error.code).toBeDefined()
})

test('A2A endpoint requires the configured bearer token', async () => {
  const previousToken = process.env.A2A_SERVER_API_KEY
  process.env.A2A_SERVER_API_KEY = 'test-secret'
  try {
    const response = await handleA2aPost(new Request('http://localhost:3000/api/a2a', {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'SendMessage', params: {} })
    }))
    expect(response.status).toBe(401)
  } finally {
    if (previousToken === undefined) delete process.env.A2A_SERVER_API_KEY
    else process.env.A2A_SERVER_API_KEY = previousToken
  }
})

test('A2A endpoint rejects request bodies larger than 1 MiB', async () => {
  const response = await handleA2aPost(new Request('http://localhost:3000/api/a2a', {
    method: 'POST',
    body: 'x'.repeat(1024 * 1024 + 1)
  }))
  expect(response.status).toBe(413)
})

test('A2A Client tool unconfigured target fallback', async () => {
  const mockUiStream = {
    append: () => {},
    update: () => {}
  } as any

  const toolInstance = a2aTool({ uiStream: mockUiStream, fullResponse: '' })
  const toolResult = await toolInstance.execute({
    message: 'Test message',
    targetAgent: 'non-existent-agent'
  })

  expect(toolResult.error).toBeDefined()
})
