import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'

export const getTools = () => {
  const tools: any = {
    search: searchTool(),
    retrieve: retrieveTool(),
    geospatialQueryTool: geospatialTool(),
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool()
  }

  return tools
}