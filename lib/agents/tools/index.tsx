import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial' // Removed useGeospatialToolMcp import
import { manusTool } from './manus'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
  // mcp?: any; // Removed mcp property as it's no longer passed down for geospatialTool
}

// Removed mcp from parameters
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

  if (process.env.MANUS_API_KEY) {
    tools.manusTask = manusTool({
      uiStream,
      fullResponse
    })
  }

  return tools
}