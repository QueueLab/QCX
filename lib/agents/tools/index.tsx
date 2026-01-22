import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'

import { MapProvider } from '@/lib/store/settings'

export interface ToolProps {
  fullResponse: string
  mapProvider?: MapProvider
}

export const getTools = ({ fullResponse, mapProvider }: ToolProps) => {
  const tools: any = {
    search: searchTool({
      fullResponse
    }),
    retrieve: retrieveTool({
      fullResponse
    }),
    geospatialQueryTool: geospatialTool({
      mapProvider
    })
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool({
      fullResponse
    })
  }

  return tools
}
