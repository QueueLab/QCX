import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'
import { mapboxGeocodingTool } from './mapbox/geocoding'
import { mapboxDirectionsTool } from './mapbox/directions'
import { mapboxMatrixTool } from './mapbox/matrix'
import { mapboxIsochroneTool } from './mapbox/isochrone'
import { mapboxStaticImageTool } from './mapbox/static-image'

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
}

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
    geospatialQueryTool: geospatialTool({
      uiStream
    }),
    mapboxGeocoding: mapboxGeocodingTool({
      uiStream,
      fullResponse
    }),
    mapboxDirections: mapboxDirectionsTool({
      uiStream,
      fullResponse
    }),
    mapboxMatrix: mapboxMatrixTool({
      uiStream,
      fullResponse
    }),
    mapboxIsochrone: mapboxIsochroneTool({
      uiStream,
      fullResponse
    }),
    mapboxStaticImage: mapboxStaticImageTool({
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