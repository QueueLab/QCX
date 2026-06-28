import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial' // Removed useGeospatialToolMcp import

import { MapProvider } from '@/lib/store/settings'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
  mapProvider?: MapProvider
  userId?: string
  chatId?: string
}

export const getTools = ({ uiStream, fullResponse, mapProvider, userId, chatId }: ToolProps) => {
  const tools: any = {
    retrieve: retrieveTool({
      uiStream,
      fullResponse,
      userId,
      chatId
    }),
    geospatialQueryTool: geospatialTool({
      uiStream,
      mapProvider,
      userId,
      chatId
    })
  }

  if (process.env.TAVILY_API_KEY) {
    tools.search = searchTool({
      uiStream,
      fullResponse,
      userId,
      chatId
    })
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool({
      uiStream,
      fullResponse,
      userId,
      chatId
    })
  }

  return tools
}
