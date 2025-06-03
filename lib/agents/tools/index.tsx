// import { createStreamableUI } from 'ai/rsc' // Removed, not suitable for server-side
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'

// ToolProps is removed as uiStream and fullResponse are client-side constructs.
// export interface ToolProps {
//   uiStream: ReturnType<typeof createStreamableUI>
//   fullResponse: string
// }

// getTools will now directly return the tool definitions for the MCP handler.
// The individual tool files will be refactored to not expect uiStream or fullResponse.
export const getTools = () => {
  const tools: any = {
    search: searchTool(),
    retrieve: retrieveTool(),
    geospatialQueryTool: geospatialTool()
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool()
  }

  return tools
}
