'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMap } from './map-context'
import { getElevationStats } from '@/lib/utils/elevation'

interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number;
}

interface ElevationHeatmapLayerProps {
  id?: string;
  points: ElevationPoint[];
  statistics?: {
    min: number;
    max: number;
    average: number;
    count: number;
  };
}

export function ElevationHeatmapLayer({ id = 'elevation', points, statistics }: ElevationHeatmapLayerProps) {
  const { map } = useMap()
  const sourceId = `elevation-heatmap-source-${id}`
  const heatmapLayerId = `elevation-heatmap-layer-${id}`
  const pointsLayerId = `elevation-points-layer-${id}`

  // Keep track of layers added to remove them cleanly
  const layersAdded = useRef(false);

  useEffect(() => {
    if (!map || !points || points.length === 0) return

    // Calculate stats if not provided
    const stats = statistics || getElevationStats(points);
    const { min, max } = stats;

    // Normalize elevation for heat map intensity (0-1 scale)
    const intensity = (val: number) => (max === min ? 0.5 : (val - min) / (max - min));

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
          intensity: intensity(point.elevation)
        }
      }))
    }

    const addLayers = () => {
      if (map.getSource(sourceId)) {
        // Update data if source exists
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        // Add the data source
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        })
      }

      // Add heatmap layer if not exists
      if (!map.getLayer(heatmapLayerId)) {
        map.addLayer({
          id: heatmapLayerId,
          type: 'heatmap',
          source: sourceId,
          maxzoom: 15,
          paint: {
            // Increase weight based on elevation intensity
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
            // Color ramp for the heatmap (elevation-based proxy)
            // Blue (low) -> Green (mid) -> Yellow (high) -> Red (very high)
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
        layersAdded.current = true;
      }

      // Add circle layer for high zoom levels if not exists
      if (!map.getLayer(pointsLayerId)) {
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
        layersAdded.current = true;

        // Popup logic
        map.on('click', pointsLayerId, (e) => {
          if (!e.features || e.features.length === 0) return

          const feature = e.features[0]
          const elevation = feature.properties?.elevation

          if (elevation !== undefined) {
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`<strong>Elevation:</strong> ${elevation.toFixed(1)}m`)
              .addTo(map)
          }
        })

        // Cursor logic
        map.on('mouseenter', pointsLayerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })

        map.on('mouseleave', pointsLayerId, () => {
          map.getCanvas().style.cursor = ''
        })
      }
    }

    if (map.isStyleLoaded()) {
      addLayers()
    } else {
      map.on('load', addLayers)
    }

    // Cleanup handled by return function of useEffect
    return () => {
      // We don't remove source immediately to avoid flickering if component re-renders quickly
      // But for clean unmount we should.
      // However, usually we want layers to persist until explicitly removed or component unmounted.
      if (map.isStyleLoaded()) {
        if (map.getLayer(pointsLayerId)) map.removeLayer(pointsLayerId)
        if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      }
      layersAdded.current = false;
    }
  }, [map, id, points, statistics]) // Re-run if points change

  return null
}
