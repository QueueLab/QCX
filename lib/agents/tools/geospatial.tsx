import { createStreamableUI } from 'ai/rsc'
import { geospatialQuerySchema } from '@/lib/schema/geospatial'
import { MapProvider } from '@/lib/store/settings'
import { ToolProps } from './index'
import { recordUsageEvent } from '@/lib/actions/usage'

interface GeospatialToolProps extends Omit<ToolProps, 'fullResponse'> {
  userId?: string
  chatId?: string
}

export const geospatialTool = ({
  uiStream,
  mapProvider,
  userId,
  chatId
}: GeospatialToolProps) => ({
  description: 'Use Mapbox via Composio to answer geospatial, distance, and direction queries.',
  parameters: geospatialQuerySchema,
  execute: async (params: any) => {
    // This is a trigger for the UI component MapQueryHandler to invoke the actual MCP tool via Composio
    // on the client side since it requires Mapbox context.

    if (userId) {
      recordUsageEvent({
        userId,
        chatId,
        kind: 'tool',
        source: 'geospatialQueryTool'
      }).catch(console.error)
    }

    return {
      type: 'MAP_QUERY_TRIGGER',
      params,
      mapProvider
    }
  }
})
