'use client'

import { useEffect } from 'react'
import type mapboxgl from 'mapbox-gl'
import { useMap } from './map-context'
import type { FeatureCollection } from 'geojson'

interface GeoJsonLayerProps {
  id: string;
  data: FeatureCollection;
}

export function GeoJsonLayer({ id, data }: GeoJsonLayerProps) {
  const { map } = useMap()

  useEffect(() => {
    if (!map || !data) return

    const sourceId = `geojson-source-${id}`
    const pointLayerId = `geojson-point-layer-${id}`
    const polygonLayerId = `geojson-polygon-layer-${id}`
    const polygonOutlineLayerId = `geojson-polygon-outline-layer-${id}`

    const onMapLoad = () => {
      // Add source if it doesn't exist
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: data
        })
      } else {
        // If source exists, just update the data
        const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
        source.setData(data);
      }

      // Add polygon layer for fill
      if (!map.getLayer(polygonLayerId)) {
        map.addLayer({
          id: polygonLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#088',
            'fill-opacity': 0.4
          }
        })
      }

      // Add polygon layer for outline
      if (!map.getLayer(polygonOutlineLayerId)) {
        map.addLayer({
          id: polygonOutlineLayerId,
          type: 'line',
          source: sourceId,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'line-color': '#088',
            'line-width': 2
          }
        })
      }

      // Add point layer for circles
      if (!map.getLayer(pointLayerId)) {
        map.addLayer({
          id: pointLayerId,
          type: 'circle',
          source: sourceId,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 6,
            'circle-color': '#B42222',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })
      }
    }

    if (map.isStyleLoaded()) {
      onMapLoad()
    } else {
      map.on('load', onMapLoad)
    }

    // Cleanup function
    return () => {
      if (map.isStyleLoaded()) {
        if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId)
        if (map.getLayer(polygonLayerId)) map.removeLayer(polygonLayerId)
        if (map.getLayer(polygonOutlineLayerId)) map.removeLayer(polygonOutlineLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      }
    }
  }, [map, id, data])

  return null // This component does not render any DOM elements itself
}