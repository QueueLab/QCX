import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial' // Removed useGeospatialToolMcp import

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
  mapLocation?: object
}

// Removed mcp from parameters
export const getTools = ({ uiStream, fullResponse, mapLocation }: ToolProps) => {
  const tools: any = {
    search: searchTool({
      uiStream,
      fullResponse,
      mapLocation
    }),
    retrieve: retrieveTool({
      uiStream,
      fullResponse
    }),
    // geospatialTool now only requires uiStream
    geospatialQueryTool: geospatialTool({
      uiStream
      // mcp: mcp || null // Removed mcp argument
    })
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool({
      uiStream,
      fullResponse
    })
  }

  return tools
}