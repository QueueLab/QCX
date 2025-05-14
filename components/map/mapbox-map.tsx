
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import * as turf from '@turf/turf'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useMapToggle, MapToggleEnum } from '../map-toggle-context'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

export const Mapbox: React.FC<{ 
  position?: { latitude: number; longitude: number; };
  onLoad?: () => void; // Added onLoad prop as per user description
}> = ({ position, onLoad }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const rotationFrameRef = useRef<number | null>(null)
  const polygonLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lineLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lastInteractionRef = useRef<number>(Date.now())
  const isRotatingRef = useRef<boolean>(false)
  const isUpdatingPositionRef = useRef<boolean>(false)
  const geolocationWatchIdRef = useRef<number | null>(null)
  const initializedRef = useRef<boolean>(false)
  const currentMapCenterRef = useRef<[number, number]>([
    position?.longitude ?? -74.0060152,
    position?.latitude ?? 40.7127281
  ])
  const drawingFeatures = useRef<any>(null)
  const { mapType } = useMapToggle()
  const previousMapTypeRef = useRef<MapToggleEnum | null>(null)

  // Formats the area or distance for display
  const formatMeasurement = useCallback((value: number, isArea = true) => {
    if (isArea) {
      // Area formatting
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)} km²`
      } else {
        return `${value.toFixed(2)} m²`
      }
    } else {
      // Distance formatting
      if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} km`
      } else {
        return `${value.toFixed(0)} m`
      }
    }
  }, [])

  // Create measurement labels for all features
  const updateMeasurementLabels = useCallback(() => {
    if (!map.current || !drawRef.current) return

    // Remove existing labels
    Object.values(polygonLabelsRef.current).forEach(marker => marker.remove())
    Object.values(lineLabelsRef.current).forEach(marker => marker.remove())
    polygonLabelsRef.current = {}
    lineLabelsRef.current = {}

    const features = drawRef.current.getAll().features
    features.forEach(feature => {
      const id = feature.id as string
      if (feature.geometry.type === 'Polygon') {
        // Calculate area for polygons
        const area = turf.area(feature)
        const formattedArea = formatMeasurement(area, true)

        // Get centroid for label placement
        const centroid = turf.centroid(feature)
        const coordinates = centroid.geometry.coordinates

        // Create a label
        const el = document.createElement('div')
        el.className = 'area-label'
        el.style.background = 'rgba(255, 255, 255, 0.8)'
        el.style.padding = '4px 8px'
        el.style.borderRadius = '4px'
        el.style.fontSize = '12px'
        el.style.fontWeight = 'bold'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
        el.style.pointerEvents = 'none'
        el.textContent = formattedArea

        // Add marker for the label
        if (map.current) {
          const marker = new mapboxgl.Marker({
            element: el
          })
            .setLngLat(coordinates as [number, number])
            .addTo(map.current)
          polygonLabelsRef.current[id] = marker
        }
      } else if (feature.geometry.type === 'LineString') {
        // Calculate length for lines
        const length = turf.length(feature, { units: 'kilometers' }) * 1000 // Convert to meters
        const formattedLength = formatMeasurement(length, false)

        // Get midpoint for label placement
        const line = feature.geometry.coordinates
        const midIndex = Math.floor(line.length / 2) - 1
        const midpoint = midIndex >= 0 ? line[midIndex] : line[0]

        // Create a label
        const el = document.createElement('div')
        el.className = 'distance-label'
        el.style.background = 'rgba(255, 255, 255, 0.8)'
        el.style.padding = '4px 8px'
        el.style.borderRadius = '4px'
        el.style.fontSize = '12px'
        el.style.fontWeight = 'bold'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
        el.style.pointerEvents = 'none'
        el.textContent = formattedLength

        // Add marker for the label
        if (map.current) {
          const marker = new mapboxgl.Marker({
            element: el
          })
            .setLngLat(midpoint as [number, number])
            .addTo(map.current)
          lineLabelsRef.current[id] = marker
        }
      }
    })
  }, [formatMeasurement])

  // Handle map rotation
  const rotateMap = useCallback(() => {
    if (map.current && isRotatingRef.current && !isUpdatingPositionRef.current) {
      const bearing = map.current.getBearing()
      map.current.setBearing(bearing + 0.1)
      rotationFrameRef.current = requestAnimationFrame(rotateMap)
    }
  }, [])

  const startRotation = useCallback(() => {
    if (!isRotatingRef.current && map.current && !isUpdatingPositionRef.current) {
      isRotatingRef.current = true
      rotateMap()
    }
  }, [rotateMap])

  const stopRotation = useCallback(() => {
    if (rotationFrameRef.current) {
      cancelAnimationFrame(rotationFrameRef.current)
      rotationFrameRef.current = null
      isRotatingRef.current = false
    }
  }, [])

  const handleUserInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
    stopRotation()
    // Update the current map center ref when user interacts with the map
    if (map.current) {
      const center = map.current.getCenter()
      currentMapCenterRef.current = [center.lng, center.lat]
    }
  }, [stopRotation])

  const updateMapPosition = useCallback(async (latitude: number, longitude: number) => {
    if (map.current && !isUpdatingPositionRef.current) {
      isUpdatingPositionRef.current = true
      stopRotation()
      try {
        // Update our current map center ref
        currentMapCenterRef.current = [longitude, latitude]
        await new Promise<void>((resolve) => {
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 12,
            essential: true,
            speed: 0.5,
            curve: 1,
          })
          map.current?.once('moveend', () => {
            resolve()
          })
        })
        setTimeout(() => {
          if (mapType === MapToggleEnum.RealTimeMode) {
            startRotation()
          }
          isUpdatingPositionRef.current = false
        }, 500)
      } catch (error) {
        console.error('Error updating map position:', error)
        isUpdatingPositionRef.current = false
      }
    }
  }, [mapType, startRotation, stopRotation])

  // Set up drawing tools
  const setupDrawingTools = useCallback(() => {
    if (!map.current) return

    // Remove existing draw control if present
    if (drawRef.current) {
      try {
        map.current.off('draw.create', updateMeasurementLabels)
        map.current.off('draw.delete', updateMeasurementLabels)
        map.current.off('draw.update', updateMeasurementLabels)
        map.current.removeControl(drawRef.current)
        drawRef.current = null
        // Clean up any existing labels
        Object.values(polygonLabelsRef.current).forEach(marker => marker.remove())
        Object.values(lineLabelsRef.current).forEach(marker => marker.remove())
        polygonLabelsRef.current = {}
        lineLabelsRef.current = {}
      } catch (e) {
        console.log('Error removing draw control:', e)
      }
    }

    // Create new draw control with both polygon and line tools
    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
        line_string: true
      },
      // Start in polygon mode by default
      defaultMode: 'draw_polygon'
    })

    // Add control to map
    map.current.addControl(drawRef.current, 'top-right')

    // Set up event listeners for measurements
    map.current.on('draw.create', updateMeasurementLabels)
    map.current.on('draw.delete', updateMeasurementLabels)
    map.current.on('draw.update', updateMeasurementLabels)

    // Restore previous drawings if they exist
    if (drawingFeatures.current && drawingFeatures.current.features.length > 0) {
      // Add each feature back to the draw tool
      drawingFeatures.current.features.forEach((feature: any) => {
        drawRef.current?.add(feature)
      })
      // Update labels after restoring features
      setTimeout(updateMeasurementLabels, 100)
    }
  }, [updateMeasurementLabels])

  // Set up geolocation watcher
  const setupGeolocationWatcher = useCallback(() => {
    if (geolocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
      geolocationWatchIdRef.current = null
    }

    if (mapType !== MapToggleEnum.RealTimeMode) return

    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser')
      return
    }

    geolocationWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        updateMapPosition(latitude, longitude)
      },
      (error) => {
        console.error('Error getting geolocation:', error)
        toast('Error getting geolocation. Please check your browser settings.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }, [mapType, updateMapPosition])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current || initializedRef.current) return

    initializedRef.current = true

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: currentMapCenterRef.current,
      zoom: 12,
      pitch: 45, // Initial pitch for a 3D-like view
      bearing: 0, // Initial bearing
      projection: { name: 'globe' } // Use globe projection
    })

    map.current.on('style.load', () => {
      if (map.current) {
        map.current.setFog({})
      }
    })

    map.current.on('load', () => {
      if (map.current) {
        // Call onLoad callback if provided
        if (onLoad) {
          onLoad();
        }
        setupDrawingTools()
        if (mapType === MapToggleEnum.RealTimeMode) {
          startRotation()
          setupGeolocationWatcher()
        } else {
          stopRotation()
          if (geolocationWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
            geolocationWatchIdRef.current = null
          }
        }
      }
    })

    // Event listeners for user interaction
    map.current.on('mousedown', handleUserInteraction)
    map.current.on('touchstart', handleUserInteraction)
    map.current.on('wheel', handleUserInteraction)
    map.current.on('dragstart', handleUserInteraction)

    // Set an interval to restart rotation if no interaction for a while
    const rotationCheckInterval = setInterval(() => {
      if (
        mapType === MapToggleEnum.RealTimeMode &&
        !isRotatingRef.current &&
        !isUpdatingPositionRef.current &&
        Date.now() - lastInteractionRef.current > 30000 // 30 seconds
      ) {
        startRotation()
      }
    }, 5000) // Check every 5 seconds

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      if (rotationFrameRef.current) {
        cancelAnimationFrame(rotationFrameRef.current)
      }
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
      }
      clearInterval(rotationCheckInterval)
      initializedRef.current = false
    }
  }, [mapType, startRotation, stopRotation, handleUserInteraction, setupDrawingTools, setupGeolocationWatcher, onLoad]) // Added onLoad to dependency array

  // Handle map type changes
  useEffect(() => {
    if (map.current && previousMapTypeRef.current !== mapType) {
      if (mapType === MapToggleEnum.RealTimeMode) {
        startRotation()
        setupGeolocationWatcher()
      } else {
        stopRotation()
        if (geolocationWatchIdRef.current !== null) {
          navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
          geolocationWatchIdRef.current = null
        }
        // When switching away from RealTimeMode, reset map to a non-rotated view if it was rotating
        if (previousMapTypeRef.current === MapToggleEnum.RealTimeMode) {
          map.current.flyTo({
            bearing: 0,
            pitch: 45, // Reset pitch if desired
            essential: true
          })
        }
      }
      previousMapTypeRef.current = mapType
    }
  }, [mapType, startRotation, stopRotation, setupGeolocationWatcher])

  // Update map position when position prop changes
  useEffect(() => {
    if (position && map.current) {
      updateMapPosition(position.latitude, position.longitude)
    }
  }, [position, updateMapPosition])

  // Save drawing features before component unmounts or draw tool is re-initialized
  useEffect(() => {
    return () => {
      if (drawRef.current) {
        drawingFeatures.current = drawRef.current.getAll()
      }
    }
  }, [])

  return (
    <div 
      ref={mapContainer} 
      className="mapbox-map-container" 
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
    />
  )
}

export default Mapbox;

