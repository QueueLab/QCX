'use client'

import { SearchSection } from './search-section'
import { VideoSearchSection } from './video-search-section'
import RetrieveSection from './retrieve-section'
import { MapQueryHandler } from './map/map-query-handler'
import { ResolutionImage } from './resolution-image'

interface ToolResultRendererProps {
  toolName: string
  result: any
}

export function ToolResultRenderer({ toolName, result }: ToolResultRendererProps) {
  if (!result) return null

  switch (toolName) {
    case 'search':
      return <SearchSection result={JSON.stringify(result)} />
    case 'videoSearch':
      return <VideoSearchSection result={JSON.stringify(result)} />
    case 'retrieve':
      return <RetrieveSection data={result} />
    case 'geospatialQueryTool': {
      if (result.type === 'MAP_QUERY_TRIGGER') {
        const mapUrl = result.mcp_response?.mapUrl
        const placeName = result.mcp_response?.location?.place_name
        return (
          <>
            {mapUrl && (
              <ResolutionImage
                src={mapUrl}
                className="mb-0"
                alt={placeName ? `Map of ${placeName}` : 'Map Preview'}
              />
            )}
            <MapQueryHandler toolOutput={result} />
          </>
        )
      }
      return null
    }
    default:
      return null
  }
}
