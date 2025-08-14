import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { BotMessage } from '@/components/message'
import { Card } from '@/components/ui/card'
import { isochroneSchema } from '@/lib/schema/mapbox'
import { getConnectedMcpClient, closeClient } from './mcp-client'
import { ToolProps } from '..'

export const mapboxIsochroneTool = ({ uiStream }: ToolProps) => ({
  description: 'Generate isochrone polygons to show areas reachable within a certain time.',
  parameters: isochroneSchema,
  execute: async ({
    location,
    contour_minutes,
    profile
  }: {
    location: string
    contour_minutes: number
    profile: 'driving' | 'walking' | 'cycling'
  }) => {
    const uiFeedbackStream = createStreamableValue<string>()
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />)

    uiFeedbackStream.update(
      `Generating ${contour_minutes}-minute isochrone for "${location}"...`
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
      const toolArgs = { location, contour_minutes, profile }
      const isochroneResult = await mcpClient.callTool({
        name: 'mapbox_isochrone',
        arguments: toolArgs
      })

      const toolResults = (isochroneResult as any)?.tool_results || []
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
      console.error('Mapbox isochrone tool error:', error)
      const errorMessage = `Error generating isochrone: ${error.message}`
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
