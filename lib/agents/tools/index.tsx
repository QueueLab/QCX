import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'

import { MapProvider } from '@/lib/store/settings'

export interface ToolProps {
  mapProvider?: MapProvider
}

export const getTools = ({ mapProvider }: ToolProps) => {
  const tools: any = {
    search: searchTool(),
    retrieve: retrieveTool(),
    geospatialQueryTool: geospatialTool({ mapProvider })
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool()
  }

  return tools
}