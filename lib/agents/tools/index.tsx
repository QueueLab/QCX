import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'
import { supermemoryTools } from '@supermemory/tools/ai-sdk'

import { MapProvider } from '@/lib/store/settings'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
  mapProvider?: MapProvider
  userId?: string
}

export const getTools = ({ uiStream, fullResponse, mapProvider, userId }: ToolProps) => {
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
      mapProvider
    })
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool({
      uiStream,
      fullResponse
    })
  }

  if (process.env.SUPERMEMORY_API_KEY && userId) {
    const memoryTools = supermemoryTools(process.env.SUPERMEMORY_API_KEY, {
      projectId: userId
    })
    tools.searchMemories = memoryTools.searchMemories
    tools.addMemory = memoryTools.addMemory
  }

  return tools
}
