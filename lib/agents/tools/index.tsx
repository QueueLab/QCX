import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { mcpGeocodeTool } from './tool-mcp-geocode'
import { mcpDistanceTool } from './tool-mcp-distance'
import { mcpNearbyTool } from './tool-mcp-nearby'
import { mcpMapLinkTool } from './tool-mcp-maplink'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
}

export const getTools = ({ uiStream, fullResponse }: ToolProps) => {
  const tools: any = {
    search: searchTool({
      uiStream,
      fullResponse
    }),
    retrieve: retrieveTool({
      uiStream,
      fullResponse
    }),
    mcp_geocode: mcpGeocodeTool({ uiStream, fullResponse }),
    mcp_calculate_distance: mcpDistanceTool({ uiStream, fullResponse }),
    mcp_search_nearby_places: mcpNearbyTool({ uiStream, fullResponse }),
    mcp_generate_map_link: mcpMapLinkTool({ uiStream, fullResponse })
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool({
      uiStream,
      fullResponse
    })
  }

  return tools
}
