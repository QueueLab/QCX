import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { BotMessage } from '@/components/message'
import { Card } from '@/components/ui/card'
import { geocodingSchema } from '@/lib/schema/mapbox'
import { getConnectedMcpClient, closeClient } from './mcp-client'
import { ToolProps } from '..'

export const mapboxGeocodingTool = ({ uiStream }: ToolProps) => ({
  description: 'Get coordinates for a location and optionally a map.',
  parameters: geocodingSchema,
  execute: async ({
    query,
    includeMap
  }: {
    query: string
    includeMap: boolean
  }) => {
    const uiFeedbackStream = createStreamableValue<string>()
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />)

    uiFeedbackStream.update(`Searching for "${query}"...`)

    const mcpClient = await getConnectedMcpClient()
    if (!mcpClient) {
      const error =
        'Mapbox tool is not available. Please check your configuration.'
      uiFeedbackStream.update(error)
      return { error }
    }

    let result
    try {
      const toolArgs = { query, includeMapPreview: includeMap }
      const geocodeResult = await mcpClient.callTool({
        name: 'mapbox_geocoding',
        arguments: toolArgs
      })

      const toolResults = (geocodeResult as any)?.tool_results || []
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
      console.error('Mapbox geocoding tool error:', error)
      const errorMessage = `Error searching for "${query}": ${error.message}`
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
