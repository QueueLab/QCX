'use client'

import { useEffect, useState } from 'react'
import { useMap } from './map-context'

interface ElevationPoint {
  lng: number;
  lat: number;
  elevation: number;
}

interface ElevationHeatmapLayerProps {
  id: string;
  points: ElevationPoint[];
  statistics?: {
    min: number;
    max: number;
    average: number;
    count: number;
  };
}

export function ElevationHeatmapLayer({ id, points, statistics }: ElevationHeatmapLayerProps) {
  const { map } = useMap()
  const [mapboxgl, setMapboxgl] = useState<any>(null)

  useEffect(() => {
    import('mapbox-gl').then(mod => {
      setMapboxgl(mod.default)
    })
  }, [])

  useEffect(() => {
    if (!map || !points || points.length === 0 || !mapboxgl) return

    const sourceId = `elevation-heatmap-source-${id}`
    const heatmapLayerId = `elevation-heatmap-layer-${id}`
    const pointsLayerId = `elevation-points-layer-${id}`

    const geojson: any = {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        },
        properties: {
          elevation: point.elevation,
          intensity: statistics && statistics.max !== statistics.min
            ? (point.elevation - statistics.min) / (statistics.max - statistics.min)
            : 0.5
        }
      }))
    }

    const onMapLoad = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        })

        map.addLayer({
          id: heatmapLayerId,
          type: 'heatmap',
          source: sourceId,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.7, 15, 0.5]
          }
        })

        map.addLayer({
          id: pointsLayerId,
          type: 'circle',
          source: sourceId,
          minzoom: 14,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 3, 22, 8],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'intensity'],
              0, '#2166ac',
              0.25, '#67a9cf',
              0.5, '#f7f7f7',
              0.75, '#ef8a62',
              1, '#b2182b'
            ],
            'circle-stroke-color': 'white',
            'circle-stroke-width': 1,
            'circle-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.8]
          }
        })

        const clickHandler = (e: any) => {
          if (!e.features || e.features.length === 0) return
          const elevation = e.features[0].properties?.elevation
          if (elevation !== undefined) {
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`<strong>Elevation:</strong> ${elevation}m`)
              .addTo(map)
          }
        }

        map.on('click', pointsLayerId, clickHandler)
        map.on('mouseenter', pointsLayerId, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', pointsLayerId, () => { map.getCanvas().style.cursor = '' })
      }
    }

    if (map.isStyleLoaded()) {
      onMapLoad()
    } else {
      map.once('load', onMapLoad)
    }

    return () => {
      if (map) {
        if (map.getLayer(pointsLayerId)) map.removeLayer(pointsLayerId)
        if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      }
    }
  }, [map, id, points, statistics, mapboxgl])

  return null
}
