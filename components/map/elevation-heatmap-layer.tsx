'use client'

import { useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
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

  useEffect(() => {
    if (!map || !points || points.length === 0) return

    const sourceId = `elevation-heatmap-source-${id}`
    const heatmapLayerId = `elevation-heatmap-layer-${id}`
    const pointsLayerId = `elevation-points-layer-${id}`

    // Convert points to GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        },
        properties: {
          elevation: point.elevation,
          // Normalize elevation for heat map intensity (0-1 scale)
          intensity: statistics && statistics.max !== statistics.min
            ? (point.elevation - statistics.min) / (statistics.max - statistics.min)
            : 0.5
        }
      }))
    }

    const onMapLoad = () => {
      if (!map.getSource(sourceId)) {
        // Add the data source
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        })

        // Add heatmap layer
        map.addLayer({
          id: heatmapLayerId,
          type: 'heatmap',
          source: sourceId,
          paint: {
            // Increase weight based on elevation
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'intensity'],
              0, 0,
              1, 1
            ],
            // Increase intensity as zoom increases
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              15, 3
            ],
            // Color ramp for the heatmap (elevation-based)
            // Blue (low) -> Cyan -> White -> Orange -> Red (high)
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
            // Adjust heatmap radius by zoom level
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 2,
              15, 20
            ],
            // Opacity
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              7, 0.7,
              15, 0.5
            ]
          }
        })

        // Add circle layer for high zoom levels
        map.addLayer({
          id: pointsLayerId,
          type: 'circle',
          source: sourceId,
          minzoom: 14,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 3,
              22, 8
            ],
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
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 0,
              15, 0.8
            ]
          }
        })

        // Add click handler to show elevation value
        const clickHandler = (e: any) => {
          if (!e.features || e.features.length === 0) return

          const feature = e.features[0]
          const elevation = feature.properties?.elevation

          if (elevation !== undefined) {
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`<strong>Elevation:</strong> ${elevation}m`)
              .addTo(map)
          }
        }

        map.on('click', pointsLayerId, clickHandler)

        // Change cursor on hover
        const mouseEnterHandler = () => {
          map.getCanvas().style.cursor = 'pointer'
        }
        const mouseLeaveHandler = () => {
          map.getCanvas().style.cursor = ''
        }

        map.on('mouseenter', pointsLayerId, mouseEnterHandler)
        map.on('mouseleave', pointsLayerId, mouseLeaveHandler)
      }
    }

    if (map.isStyleLoaded()) {
      onMapLoad()
    } else {
      map.once('load', onMapLoad)
    }

    // Cleanup
    return () => {
      if (map) {
        if (map.getLayer(pointsLayerId)) map.removeLayer(pointsLayerId)
        if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      }
    }
  }, [map, id, points, statistics])

  return null
}
