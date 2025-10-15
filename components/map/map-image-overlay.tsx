'use client'

import { useMap } from '@/components/map/map-context'
import { useEffect } from 'react'
import { LngLatBounds, LngLatLike } from 'mapbox-gl'

interface MapImageOverlayProps {
  id: string
  imageUrl: string
  coordinates: [LngLatLike, LngLatLike, LngLatLike, LngLatLike]
  beforeId?: string
  opacity?: number
}

export function MapImageOverlay({
  id,
  imageUrl,
  coordinates,
  beforeId,
  opacity = 0.85
}: MapImageOverlayProps) {
  const { map } = useMap()

  useEffect(() => {
    if (
      !map ||
      !imageUrl ||
      !Array.isArray(coordinates) ||
      coordinates.length < 4 ||
      !coordinates.every(
        c => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1])
      )
    ) {
      return
    }

    const sourceId = `image-overlay-source-${id}`
    const layerId = `image-overlay-layer-${id}`
    let attached = false

    const onMapLoad = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'image',
          url: imageUrl,
          coordinates: coordinates
        })
      }

      if (!map.getLayer(layerId)) {
        if (beforeId) {
          map.addLayer(
            {
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: {
                'raster-opacity': opacity,
                'raster-fade-duration': 0
              }
            },
            beforeId
          )
        } else {
          map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': opacity,
              'raster-fade-duration': 0
            }
          })
        }
      }

      const bounds = coordinates.reduce(
        (b, c) => b.extend(c),
        new LngLatBounds(coordinates[0], coordinates[0])
      )

      map.fitBounds(bounds, {
        padding: 20,
        duration: 1000
      })
    }

    if (map.isStyleLoaded()) {
      onMapLoad()
    } else {
      attached = true
      map.once('load', onMapLoad)
    }

    return () => {
      if (attached) {
        map.off('load', onMapLoad)
      }
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId)
      }
    }
  }, [map, id, imageUrl, coordinates, beforeId, opacity])

  return null
}
