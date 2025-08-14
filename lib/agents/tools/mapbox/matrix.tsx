import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { BotMessage } from '@/components/message'
import { Card } from '@/components/ui/card'
import { matrixSchema } from '@/lib/schema/mapbox'
import { getConnectedMcpClient, closeClient } from './mcp-client'
import { ToolProps } from '..'

export const mapboxMatrixTool = ({ uiStream }: ToolProps) => ({
  description: 'Calculate travel times between multiple origins and destinations.',
  parameters: matrixSchema,
  execute: async ({
    origins,
    destinations,
    profile
  }: {
    origins: string[]
    destinations: string[]
    profile: 'driving' | 'walking' | 'cycling'
  }) => {
    const uiFeedbackStream = createStreamableValue<string>()
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />)

    uiFeedbackStream.update(
      `Calculating travel times for ${origins.length} origins to ${destinations.length} destinations...`
    )

    const mcpClient = await getConnectedMcpClient()
    if (!mcpClient) {
      const error =
        'Mapbox tool is not available. Please check your configuration.'
      uiFeedbackStream.update(error)
      return { error }
    }

    let result
    try {
      const toolArgs = { origins, destinations, profile }
      const matrixResult = await mcpClient.callTool({
        name: 'mapbox_matrix',
        arguments: toolArgs
      })

      const toolResults = (matrixResult as any)?.tool_results || []
      if (toolResults.length === 0 || !toolResults[0]?.content) {
        throw new Error('No content returned from mapping service')
      }

      let content = toolResults[0].content
      if (typeof content === 'string') {
        const jsonRegex = /```(?:json)?\n?([\s\S]*?)\n?```/
        const match = content.match(jsonRegex)
        if (match) {
          content = JSON.parse(match[1].trim())
        } else {
          content = JSON.parse(content)
        }
      }
      result = content
    } catch (error: any) {
      console.error('Mapbox matrix tool error:', error)
      const errorMessage = `Error calculating travel times: ${error.message}`
      uiFeedbackStream.update(errorMessage)
      result = { error: errorMessage }
    } finally {
      await closeClient(mcpClient)
    }

    uiFeedbackStream.done()
    uiStream.update(
      <Card className="p-4 mt-2 text-sm">
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </Card>
    )

    return result
  }
})
