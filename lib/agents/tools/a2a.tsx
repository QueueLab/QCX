import { a2aSchema } from '@/lib/schema/a2a'
import { Card } from '@/components/ui/card'
import { ToolProps } from '.'
import { ClientFactory } from '@a2a-js/sdk/client'
import { Role } from '@a2a-js/sdk'

export interface RemoteAgentConfig {
  name: string
  url: string
  apiKey?: string
}

/** Parse and validate configured remote agents, ignoring malformed entries. */
function readConfiguredAgents(): RemoteAgentConfig[] {
  if (!process.env.A2A_REMOTE_AGENTS) return []

  try {
    const parsed: unknown = JSON.parse(process.env.A2A_REMOTE_AGENTS)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (agent): agent is RemoteAgentConfig =>
        Boolean(agent) &&
        typeof agent.name === 'string' &&
        typeof agent.url === 'string' &&
        (agent.apiKey === undefined || typeof agent.apiKey === 'string')
    )
  } catch (error) {
    console.error('Failed to parse A2A_REMOTE_AGENTS env var:', error)
    return []
  }
}

/** Resolve a requested agent without allowing unconfigured outbound origins. */
function resolveAgent(targetAgent: string | undefined, configuredAgents: RemoteAgentConfig[]) {
  if (!targetAgent) return configuredAgents[0]

  const namedAgent = configuredAgents.find(
    agent => agent.name.toLowerCase() === targetAgent.toLowerCase()
  )
  if (namedAgent) return namedAgent
  if (!/^https?:\/\//i.test(targetAgent)) return undefined

  try {
    const requestedUrl = new URL(targetAgent)
    if (requestedUrl.username || requestedUrl.password) return undefined
    const matchingAgent = configuredAgents.find(agent => {
      try {
        return new URL(agent.url).origin === requestedUrl.origin
      } catch {
        return false
      }
    })
    return matchingAgent ? { ...matchingAgent, url: requestedUrl.toString() } : undefined
  } catch {
    return undefined
  }
}

export const a2aTool = ({ uiStream }: ToolProps) => ({
  description:
    'Call a configured remote A2A (Agent-to-Agent) protocol agent to delegate tasks or query specialized agents.',
  parameters: a2aSchema,
  /** Invoke one explicitly selected, configured agent and return its response. */
  execute: async ({
    message,
    targetAgent,
    parameters
  }: {
    message: string
    targetAgent?: string
    parameters?: string
  }) => {
    uiStream.append(
      <Card className="p-4 mt-2 text-sm border-accent">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span>Communicating with A2A Remote Agent...</span>
        </div>
      </Card>
    )

    const selectedAgent = resolveAgent(targetAgent, readConfiguredAgents())
    if (!selectedAgent) {
      const errorMsg = 'No matching remote A2A agent is configured.'
      uiStream.update(<Card className="p-4 mt-2 text-sm text-destructive">{errorMsg}</Card>)
      return { error: errorMsg }
    }

    try {
      const factory = new ClientFactory()
      const client = await factory.createFromUrl(selectedAgent.url)
      const requestOptions: any = selectedAgent.apiKey
        ? { serviceParameters: { authorization: `Bearer ${selectedAgent.apiKey}` } }
        : {}
      const payloadMessage = parameters ? `${message}\n\nParameters: ${parameters}` : message
      const request = {
        tenant: '',
        message: {
          messageId: crypto.randomUUID(),
          contextId: '',
          taskId: '',
          role: Role.ROLE_USER,
          parts: [{ content: { $case: 'text' as const, value: payloadMessage }, metadata: undefined, filename: '', mediaType: 'text/plain' }],
          metadata: undefined,
          extensions: [],
          referenceTaskIds: []
        },
        configuration: undefined,
        metadata: undefined
      }

      let accumulatedResponse = ''
      let taskState = 'completed'
      const agentCard = await client.getAgentCard()

      if (agentCard.capabilities?.streaming) {
        const stream = client.sendMessageStream(request, requestOptions)
        for await (const chunk of stream) {
          const payload = chunk.payload
          if (payload?.$case === 'message' && payload.value.parts) {
            for (const part of payload.value.parts) {
              if (part.content?.$case === 'text') accumulatedResponse += part.content.value
            }
          }
          if (payload?.$case === 'statusUpdate' && payload.value.status?.state) {
            taskState = String(payload.value.status.state)
          }
          if (payload?.$case === 'artifactUpdate' && payload.value.artifact?.parts) {
            for (const part of payload.value.artifact.parts) {
              if (part.content?.$case === 'text') accumulatedResponse += part.content.value
            }
          }
        }
      } else {
        const result: any = await client.sendMessage(request, requestOptions)
        if (Array.isArray(result.parts)) {
          accumulatedResponse = result.parts
            .map((part: any) => part.content?.$case === 'text' ? part.content.value : '')
            .join('')
        } else {
          accumulatedResponse = JSON.stringify(result)
        }
      }

      if (!accumulatedResponse) accumulatedResponse = 'Remote A2A agent task completed successfully.'
      uiStream.update(
        <Card className="p-4 mt-2 text-sm border-primary/20 bg-accent/10">
          <div className="font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wider">
            A2A Remote Agent ({selectedAgent.name})
          </div>
          <div className="whitespace-pre-wrap">{accumulatedResponse}</div>
        </Card>
      )
      return { response: accumulatedResponse, status: taskState }
    } catch (error) {
      console.error('A2A Client Tool Execution Error:', { agentUrl: selectedAgent.url, error })
      const errorText = 'Failed to invoke the configured remote A2A agent.'
      uiStream.update(<Card className="p-4 mt-2 text-sm text-destructive">{errorText}</Card>)
      return { error: errorText }
    }
  }
})
