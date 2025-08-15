import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'
import { MapData } from '@/components/map/map-data-context'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
  mapData?: MapData
}

export const getTools = ({ uiStream, fullResponse, mapData }: ToolProps) => {
  const tools: any = {
    search: searchTool({
      uiStream,
      fullResponse
    }),
    retrieve: retrieveTool({
      uiStream,
      fullResponse
    }),
    geospatialQueryTool: geospatialTool({
      uiStream,
      mapData
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