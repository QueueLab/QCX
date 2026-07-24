import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'
import { documentRetrieveTool } from './document-retrieve'

import { MapProvider } from '@/lib/store/settings'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
  mapProvider?: MapProvider
}

export const getTools = ({ uiStream, fullResponse, mapProvider }: ToolProps) => {
  const tools: any = {
    retrieve: retrieveTool({
      uiStream,
      fullResponse
    }),
    geospatialQueryTool: geospatialTool({
      uiStream,
      mapProvider
    }),
    documentRetrieve: documentRetrieveTool({
      uiStream,
      fullResponse
    })
  }

  if (process.env.TAVILY_API_KEY) {
    tools.search = searchTool({
      uiStream,
      fullResponse
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
