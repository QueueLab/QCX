import { createStreamableValue } from 'ai/rsc'
import { a2aSchema } from '@/lib/schema/a2a'
import { Card } from '@/components/ui/card'
import { ToolProps } from '.'
import { ClientFactory } from '@a2a-js/sdk/client'
import { Role, type Part } from '@a2a-js/sdk'

const getPartText = (part: Part) =>
  part.content?.$case === 'text' ? part.content.value : ''

export interface RemoteAgentConfig {
  name: string
  url: string
  apiKey?: string
}

export const a2aTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description:
    'Call an external or remote A2A (Agent-to-Agent) protocol agent on another system to delegate tasks, ask domain questions, or query specialized remote agents.',
  parameters: a2aSchema,
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

    // Parse configured agents from environment variable
    let configuredAgents: RemoteAgentConfig[] = []
    if (process.env.A2A_REMOTE_AGENTS) {
      try {
        configuredAgents = JSON.parse(process.env.A2A_REMOTE_AGENTS)
      } catch (e) {
        console.error('Failed to parse A2A_REMOTE_AGENTS env var:', e)
      }
    }

    let agentUrl = ''
    let apiKey: string | undefined

    if (targetAgent && /^https?:\/\//i.test(targetAgent)) {
      agentUrl = targetAgent
    } else if (targetAgent) {
      const found = configuredAgents.find(
        a => a.name.toLowerCase() === targetAgent.toLowerCase()
      )
      if (found) {
        agentUrl = found.url
        apiKey = found.apiKey
      }
    }

    if (!agentUrl && configuredAgents.length > 0) {
      agentUrl = configuredAgents[0].url
      apiKey = configuredAgents[0].apiKey
    }

    if (!agentUrl) {
      const errorMsg =
        'No valid remote A2A agent target found. Specify a direct agent URL or configure A2A_REMOTE_AGENTS in environment.'
      uiStream.update(
        <Card className="p-4 mt-2 text-sm text-destructive">{errorMsg}</Card>
      )
      return { error: errorMsg }
    }

    try {
      const factory = new ClientFactory()
      const client = await factory.createFromUrl(agentUrl)

      const requestOptions: any = {}
      if (apiKey) {
        requestOptions.serviceParameters = {
          authorization: `Bearer ${apiKey}`
        }
      }

      let payloadMessage = message
      if (parameters) {
        payloadMessage += `\n\nParameters: ${parameters}`
      }

      let accumulatedResponse = ''
      let taskState = 'completed'

      try {
        const stream = client.sendMessageStream(
          {
            message: {
              role: Role.ROLE_USER,
              parts: [
                {
                  content: { $case: 'text', value: payloadMessage },
                  metadata: undefined,
                  filename: '',
                  mediaType: 'text/plain'
                }
              ],
              messageId: `msg-${Date.now()}`,
              contextId: '',
              taskId: '',
              metadata: undefined,
              extensions: [],
              referenceTaskIds: []
            },
            tenant: '',
            configuration: undefined,
            metadata: undefined
          },
          requestOptions
        )

        for await (const chunk of stream) {
          let hasNewText = false
          if (chunk.payload?.$case === 'message') {
            for (const part of chunk.payload.value.parts) {
              const partText = getPartText(part)
              if (partText) {
                accumulatedResponse += partText
                hasNewText = true
              }
            }
          } else if (chunk.payload?.$case === 'statusUpdate') {
            taskState = String(chunk.payload.value.status?.state)
          } else if (
            chunk.payload?.$case === 'artifactUpdate' &&
            chunk.payload.value.artifact?.parts
          ) {
            for (const part of chunk.payload.value.artifact.parts) {
              const partText = getPartText(part)
              if (partText) {
                accumulatedResponse += partText
                hasNewText = true
              }
            }
          }

          if (hasNewText) {
            uiStream.update(
              <Card className="p-4 mt-2 text-sm border-primary/20 bg-accent/10">
                <div className="font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                  A2A Remote Agent ({agentUrl})
                </div>
                <div className="whitespace-pre-wrap">{accumulatedResponse}</div>
              </Card>
            )
          }
        }
      } catch (streamError) {
        // Fallback to single sendMessage if stream unsupported
        const sendResult = await client.sendMessage(
          {
            message: {
              role: Role.ROLE_USER,
              parts: [
                {
                  content: { $case: 'text', value: payloadMessage },
                  metadata: undefined,
                  filename: '',
                  mediaType: 'text/plain'
                }
              ],
              messageId: `msg-${Date.now()}`,
              contextId: '',
              taskId: '',
              metadata: undefined,
              extensions: [],
              referenceTaskIds: []
            },
            tenant: '',
            configuration: undefined,
            metadata: undefined
          },
          requestOptions
        )

        if ('parts' in sendResult) {
          accumulatedResponse = sendResult.parts
            .map(getPartText)
            .join('')
        } else {
          accumulatedResponse = JSON.stringify(sendResult)
        }
      }

      if (!accumulatedResponse) {
        accumulatedResponse = 'Remote A2A agent task completed successfully.'
      }

      uiStream.update(
        <Card className="p-4 mt-2 text-sm border-primary/20 bg-accent/10">
          <div className="font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wider">
            A2A Remote Agent ({agentUrl})
          </div>
          <div className="whitespace-pre-wrap">{accumulatedResponse}</div>
        </Card>
      )

      return {
        agentUrl,
        response: accumulatedResponse,
        status: taskState
      }
    } catch (error: any) {
      console.error('A2A Client Tool Execution Error:', error)
      const errorText = `Failed to invoke remote A2A agent at ${agentUrl}: ${error?.message || error}`
      uiStream.update(
        <Card className="p-4 mt-2 text-sm text-destructive">{errorText}</Card>
      )
      return {
        agentUrl,
        error: errorText
      }
    }
  }
})
