import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'
import { documentRetrieveTool } from './document-retrieve'
import { skyfiTool } from './skyfi'
import { DrawnFeature } from '@/lib/agents/resolution-search'

import { MapProvider } from '@/lib/store/settings'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
  mapProvider?: MapProvider
  selectedModel?: string | null
  drawnFeatures?: DrawnFeature[]
}

export const getTools = ({ uiStream, fullResponse, mapProvider, selectedModel, drawnFeatures }: ToolProps) => {
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
    }),
    skyfiQueryTool: skyfiTool({
      uiStream,
      drawnFeatures
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
