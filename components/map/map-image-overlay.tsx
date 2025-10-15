'use client'

import { useMap } from '@/components/map/map-context'
import { useEffect } from 'react'
import { LngLatBounds } from 'mapbox-gl'

interface MapImageOverlayProps {
  id: string
  imageUrl: string
  coordinates: [number, number][]
}

export function MapImageOverlay({
  id,
  imageUrl,
  coordinates
}: MapImageOverlayProps) {
  const { map } = useMap()

  useEffect(() => {
    if (!map || !imageUrl || !coordinates) return

    const sourceId = `image-overlay-source-${id}`
    const layerId = `image-overlay-layer-${id}`

    const onMapLoad = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'image',
          url: imageUrl,
          coordinates: [
            coordinates[0], // top-left
            coordinates[1], // top-right
            coordinates[2], // bottom-right
            coordinates[3] // bottom-left
          ]
        })
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': 0.85,
            'raster-fade-duration': 0
          }
        })
      }

      const bounds = new LngLatBounds(
        coordinates[3], // bottom-left
        coordinates[1] // top-right
      )

      map.fitBounds(bounds, {
        padding: 20,
        duration: 1000
      })
    }

    if (map.isStyleLoaded()) {
      onMapLoad()
    } else {
      map.once('load', onMapLoad)
    }

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId)
      }
    }
  }, [map, id, imageUrl, coordinates])

  return null
}
