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

export const Mapbox: React.FC<{ position?: { latitude: number; longitude: number; } }> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const [roundedArea, setRoundedArea] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [measurementUnit, setMeasurementUnit] = useState<'meters' | 'kilometers' | 'hectares'>('meters')
  const { mapType } = useMapToggle()

  const updateMapPosition = async (latitude: number, longitude: number) => {
    if (map.current) {
      setIsLoading(true)
      try {
        await new Promise<void>((resolve) => {
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 12,
            essential: true,
            speed: 0.5,
            curve: 1,
          })
          map.current?.once('moveend', () => resolve())
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Function to rotate the map continuously
  const rotateMap = () => {
    if (map.current) {
      let bearing = map.current.getBearing()
      map.current.setBearing(bearing + 0.1)
      rotationFrameRef.current = requestAnimationFrame(rotateMap)
    }
  }

  // Handle real-time location tracking
  useEffect(() => {
    if (mapType !== MapToggleEnum.RealTimeMode) return

    let watchId: number | null = null
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser')
    } else {
      const success = async (geoPos: GeolocationPosition) => {
        await updateMapPosition(geoPos.coords.latitude, geoPos.coords.longitude)
      }

      const error = (positionError: GeolocationPositionError) => {
        console.error('Geolocation Error:', positionError.message)
        toast.error(`Location error: ${positionError.message}`)
      }
      
      watchId = navigator.geolocation.watchPosition(success, error)

      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId)
        }
      }
    }
  }, [mapType])

  // Initialize the map
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      const initialCenter: [number, number] = [
        position?.longitude ?? -74.0060152,
        position?.latitude ?? 40.7127281
      ]

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: initialCenter,
        zoom: 12,
        pitch: 60,
        bearing: -20,
        maxZoom: 22,
        attributionControl: true
      })

      // Add zoom controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

      // Add terrain
      map.current.on('load', () => {
        if (!map.current) return

        map.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })

        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })

        map.current.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        })

        // Start rotating the map
        rotateMap()
      })
    }

    return () => {
      if (map.current) {
        // Make sure we remove the draw control if it exists
        if (drawRef.current) {
          try {
            map.current.removeControl(drawRef.current)
            drawRef.current = null
          } catch (e) {
            console.log('Draw control already removed')
          }
        }
        map.current.remove()
        map.current = null
      }
    }
  }, [position?.latitude, position?.longitude])

  // Update position when props change
  useEffect(() => {
    if (map.current && position?.latitude && position?.longitude) {
      updateMapPosition(position.latitude, position.longitude)
    }
  }, [position])

  // Create a stable reference to the updateArea function
  const updateArea = useCallback(() => {
    if (!drawRef.current) return
    
    const data = drawRef.current.getAll()
    if (data.features.length > 0) {
      const area = turf.area(data)
      
      let displayArea: number
      let unit: 'meters' | 'kilometers' | 'hectares'
      
      if (area >= 1000000) {
        displayArea = Math.round((area / 1000000) * 100) / 100
        unit = 'kilometers'
      } else if (area >= 10000) {
        displayArea = Math.round((area / 10000) * 100) / 100
        unit = 'hectares'
      } else {
        displayArea = Math.round(area * 100) / 100
        unit = 'meters'
      }
      
      setRoundedArea(displayArea)
      setMeasurementUnit(unit)
    } else {
      setRoundedArea(null)
    }
  }, [])

  // Handle drawing mode toggle
  useEffect(() => {
    if (!map.current) return
    
    // Clean up any existing draw control
    if (drawRef.current) {
      if (map.current) {
        // Properly remove event listeners with the same function reference
        map.current.off('draw.create', updateArea)
        map.current.off('draw.delete', updateArea)
        map.current.off('draw.update', updateArea)
        
        try {
          map.current.removeControl(drawRef.current)
          drawRef.current = null
        } catch (e) {
          console.log('Draw control already removed')
        }
      }
    }

    // Add drawing control if in drawing mode
    if (mapType === MapToggleEnum.DrawingMode) {
      // Create a new draw instance
      drawRef.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
          line_string: true
        },
        defaultMode: 'draw_polygon'
      })

      // Add the draw control to the map
      map.current.addControl(drawRef.current, 'top-right')

      // Add drawing event listeners with the stable callback
      map.current.on('draw.create', updateArea)
      map.current.on('draw.delete', updateArea)
      map.current.on('draw.update', updateArea)
    } else {
      // Reset the area measurement when not in drawing mode
      setRoundedArea(null)
    }

    // Cleanup function
    return () => {
      if (map.current && drawRef.current) {
        // Properly remove event listeners with the same function reference
        map.current.off('draw.create', updateArea)
        map.current.off('draw.delete', updateArea)
        map.current.off('draw.update', updateArea)
      }
    }
  }, [mapType, updateArea])

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="h-full w-full overflow-hidden rounded-l-lg"
      />
      
      {isLoading && (
        <div className="absolute top-4 right-4 bg-white bg-opacity-80 p-2 rounded-lg shadow-md z-10">
          <p>Updating map position...</p>
        </div>
      )}
      
      {mapType === MapToggleEnum.DrawingMode && (
        <div className="absolute bottom-10 left-10 bg-white bg-opacity-80 p-4 rounded-lg shadow-md z-10">
          <h3 className="font-bold text-center mb-2">Area Measurement</h3>
          {roundedArea ? (
            <div className="text-center">
              <p className="text-xl font-semibold">{roundedArea}</p>
              <p className="text-sm">square {measurementUnit}</p>
              <p className="text-xs mt-2">Draw on the map to measure areas</p>
            </div>
          ) : (
            <p className="text-center">Draw a polygon to measure area</p>
          )}
        </div>
      )}
    </div>
  )
}
