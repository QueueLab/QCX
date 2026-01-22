'use client'

import { useEffect } from 'react'
import { useMapData } from './map/map-data-context'
import { Section } from './section'
import { BotMessage } from './message'

interface ResolutionSearchResult {
  summary: string
  geoJson: {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      geometry: {
        type: string
        coordinates: any
      }
      properties: {
        name: string
        description?: string
      }
    }>
  }
}

interface ResolutionSearchSectionProps {
  result: ResolutionSearchResult
}

export function ResolutionSearchSection({ result }: ResolutionSearchSectionProps) {
  const { setMapData } = useMapData()

  useEffect(() => {
    if (result.geoJson && result.geoJson.features) {
      const markers = result.geoJson.features
        .filter(f => f.geometry.type === 'Point')
        .map(f => ({
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          title: f.properties.name
        }))

      if (markers.length > 0) {
        setMapData(prev => ({
          ...prev,
          markers: [...(prev.markers || []), ...markers],
          targetPosition: { lat: markers[0].latitude, lng: markers[0].longitude }
        }))
      }
    }
  }, [result, setMapData])

  return (
    <Section title="Resolution Analysis">
      <BotMessage content={result.summary} />
    </Section>
  )
}
