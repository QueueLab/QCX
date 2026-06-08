'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMap } from './map-context'
import type { FeatureCollection } from 'geojson'

interface GeoJsonLayerProps {
  id: string;
  data: FeatureCollection;
}

export function GeoJsonLayer({ id, data }: GeoJsonLayerProps) {
  const { map } = useMap()
  const popupRef = useRef<mapboxgl.Popup | null>(null)

  useEffect(() => {
    if (!map || !data) return

    const sourceId = `geojson-source-${id}`
    const pointLayerId = `geojson-point-layer-${id}`
    const polygonLayerId = `geojson-polygon-layer-${id}`
    const polygonOutlineLayerId = `geojson-polygon-outline-layer-${id}`
    const labelLayerId = `geojson-label-layer-${id}`

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

      // Add persistent text label layer for all feature types
      if (!map.getLayer(labelLayerId)) {
        map.addLayer({
          id: labelLayerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 0.8],
            'text-max-width': 12,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1.5,
          }
        })
      }

      // Show popup with name + description on click (points and polygons)
      const handleFeatureClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
        const feature = e.features?.[0]
        if (!feature) return

        const props = feature.properties as { name?: string; description?: string } | null
        if (!props?.name) return

        const coordinates = e.lngLat

        const html = `
          <div style="font-family: sans-serif; max-width: 220px;">
            <strong style="font-size: 13px; display: block; margin-bottom: 4px;">${props.name}</strong>
            ${props.description ? `<span style="font-size: 12px; color: #555;">${props.description}</span>` : ''}
          </div>
        `

        if (popupRef.current) {
          popupRef.current.remove()
        }

        popupRef.current = new mapboxgl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(coordinates)
          .setHTML(html)
          .addTo(map)
      }

      map.on('click', pointLayerId, handleFeatureClick)
      map.on('click', polygonLayerId, handleFeatureClick)

      // Pointer cursor on hover
      const setCursorPointer = () => { map.getCanvas().style.cursor = 'pointer' }
      const setCursorDefault = () => { map.getCanvas().style.cursor = '' }

      map.on('mouseenter', pointLayerId, setCursorPointer)
      map.on('mouseleave', pointLayerId, setCursorDefault)
      map.on('mouseenter', polygonLayerId, setCursorPointer)
      map.on('mouseleave', polygonLayerId, setCursorDefault)
    }

    if (map.isStyleLoaded()) {
      onMapLoad()
    } else {
      map.on('load', onMapLoad)
    }

    // Cleanup function
    return () => {
      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }
      if (map.isStyleLoaded()) {
        if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId)
        if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId)
        if (map.getLayer(polygonLayerId)) map.removeLayer(polygonLayerId)
        if (map.getLayer(polygonOutlineLayerId)) map.removeLayer(polygonOutlineLayerId)

      }
    }
  }, [map, id, data])

  return null // This component does not render any DOM elements itself
}