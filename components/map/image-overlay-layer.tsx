'use client'

import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMap } from './map-context'
import { useMapData, ImageOverlay } from './map-data-context'
import { useMapToggle, MapToggleEnum } from '../map-toggle-context'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { createRoot } from 'react-dom/client'

interface ImageOverlayLayerProps {
  overlay: ImageOverlay;
}

export function ImageOverlayLayer({ overlay }: ImageOverlayLayerProps) {
  const { map } = useMap()
  const { setMapData } = useMapData()
  const { mapType } = useMapToggle()
  const isDrawingMode = mapType === MapToggleEnum.DrawingMode
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const deleteMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const deleteRootRef = useRef<any>(null)

  const sourceId = `image-source-${overlay.id}`
  const layerId = `image-layer-${overlay.id}`

  // Update overlay coordinates in global state
  const updateCoordinates = useCallback((index: number, lngLat: [number, number]) => {
    setMapData(prev => {
      const overlays = prev.imageOverlays || []
      const newOverlays = overlays.map(o => {
        if (o.id === overlay.id) {
          const newCoords = [...o.coordinates] as [[number, number], [number, number], [number, number], [number, number]]
          newCoords[index] = lngLat
          return { ...o, coordinates: newCoords }
        }
        return o
      })
      return { ...prev, imageOverlays: newOverlays }
    })
  }, [overlay.id, setMapData])

  const removeOverlay = useCallback(() => {
    setMapData(prev => ({
      ...prev,
      imageOverlays: (prev.imageOverlays || []).filter(o => o.id !== overlay.id)
    }))
  }, [overlay.id, setMapData])

  useEffect(() => {
    if (!map) return

    const onMapLoad = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'image',
          url: overlay.url,
          coordinates: overlay.coordinates
        })

        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': overlay.opacity || 0.7
          }
        })
      }
    }

    if (map.isStyleLoaded()) {
      onMapLoad()
    } else {
      map.on('load', onMapLoad)
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [map, sourceId, layerId, overlay.url]) // coordinates handled separately

  // Sync coordinates with map source
  useEffect(() => {
    if (!map) return
    const source = map.getSource(sourceId) as mapboxgl.ImageSource
    if (source) {
      source.setCoordinates(overlay.coordinates)
    }
  }, [map, overlay.coordinates, sourceId])

  // Sync opacity
  useEffect(() => {
    if (!map) return
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', overlay.opacity || 0.7)
    }
  }, [map, overlay.opacity, layerId])

  // Draggable markers for corners
  useEffect(() => {
    if (!map) return

    // Clean up existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (deleteMarkerRef.current) {
      deleteMarkerRef.current.remove()
      deleteMarkerRef.current = null
    }

    if (isDrawingMode) {
      // Add 4 corner markers
      overlay.coordinates.forEach((coord, index) => {
        const el = document.createElement('div')
        el.className = 'w-4 h-4 bg-white border-2 border-primary rounded-full cursor-move shadow-md'

        const marker = new mapboxgl.Marker({
          element: el,
          draggable: true
        })
          .setLngLat(coord)
          .addTo(map)

        marker.on('drag', () => {
          const newLngLat = marker.getLngLat()
          updateCoordinates(index, [newLngLat.lng, newLngLat.lat])
        })

        markersRef.current.push(marker)
      })

      // Add delete button near top-right corner
      const deleteEl = document.createElement('div')
      const root = createRoot(deleteEl)
      deleteRootRef.current = root
      root.render(
        <Button
          variant="destructive"
          size="icon"
          className="w-6 h-6 rounded-full shadow-lg"
          onClick={removeOverlay}
        >
          <X size={14} />
        </Button>
      )

      const deleteMarker = new mapboxgl.Marker({
        element: deleteEl,
        offset: [0, -20]
      })
        .setLngLat(overlay.coordinates[1]) // Near Top-right
        .addTo(map)

      deleteMarkerRef.current = deleteMarker
    }

    return () => {
      markersRef.current.forEach(m => m.remove())
      if (deleteMarkerRef.current) deleteMarkerRef.current.remove()
    }
  }, [map, isDrawingMode, overlay.coordinates, updateCoordinates, removeOverlay])

  return null
}
