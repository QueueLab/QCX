import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { BotMessage } from '@/components/message'
import { Card } from '@/components/ui/card'
import { staticImageSchema } from '@/lib/schema/mapbox'
import { getConnectedMcpClient, closeClient } from './mcp-client'
import { ToolProps } from '..'

export const mapboxStaticImageTool = ({ uiStream }: ToolProps) => ({
  description: 'Generate a static map image.',
  parameters: staticImageSchema,
  execute: async ({
    center,
    zoom,
    width,
    height
  }: {
    center: string
    zoom: number
    width: number
    height: number
  }) => {
    const uiFeedbackStream = createStreamableValue<string>()
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />)

    uiFeedbackStream.update(
      `Generating a ${width}x${height} map image centered at ${center}...`
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
      const toolArgs = { center, zoom, width, height }
      const staticImageResult = await mcpClient.callTool({
        name: 'mapbox_static_image',
        arguments: toolArgs
      })

      const toolResults = (staticImageResult as any)?.tool_results || []
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
      console.error('Mapbox static image tool error:', error)
      const errorMessage = `Error generating map image: ${error.message}`
      uiFeedbackStream.update(errorMessage)
      result = { error: errorMessage }
    } finally {
      await closeClient(mcpClient)
    }

    uiFeedbackStream.done()
    if (result.imageUrl) {
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          <img src={result.imageUrl} alt="Static Map" />
        </Card>
      )
    } else {
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )
    }

    return result
  }
})
