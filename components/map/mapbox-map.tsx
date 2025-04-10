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
  const rotationFrameRef = useRef<number | null>(null)
  const [roundedArea, setRoundedArea] = useState<number | null>(null)
  const [lineDistance, setLineDistance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [measurementUnit, setMeasurementUnit] = useState<'meters' | 'kilometers' | 'hectares'>('meters')
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([
    position?.longitude ?? -74.0060152,
    position?.latitude ?? 40.7127281
  ])
  const [drawnFeatures, setDrawnFeatures] = useState<GeoJSON.FeatureCollection>({
    type: 'FeatureCollection',
    features: []
  })
  const { mapType } = useMapToggle()
  const lastInteractionRef = useRef<number>(Date.now())
  const isRotatingRef = useRef<boolean>(false)
  const isUpdatingPositionRef = useRef<boolean>(false)

  const updateMapPosition = async (latitude: number, longitude: number) => {
    if (map.current && !isUpdatingPositionRef.current) {
      isUpdatingPositionRef.current = true
      setIsLoading(true)
      stopRotation()
      
      try {
        await new Promise<void>((resolve) => {
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 12,
            essential: true,
            speed: 0.5,
            curve: 1,
          })
          map.current?.once('moveend', () => {
            setCurrentCenter([longitude, latitude])
            resolve()
          })
        })
        // Re-apply existing drawings after position update
        if (drawRef.current && drawnFeatures.features.length > 0) {
          drawRef.current.set(drawnFeatures)
        }
        setTimeout(() => {
          if (mapType === MapToggleEnum.RealTimeMode) {
            startRotation()
          }
          isUpdatingPositionRef.current = false
          setIsLoading(false)
        }, 500)
      } catch (error) {
        console.error('Error updating map position:', error)
        isUpdatingPositionRef.current = false
        setIsLoading(false)
      }
    }
  }

  const rotateMap = useCallback(() => {
    if (map.current && isRotatingRef.current && !isUpdatingPositionRef.current) {
      let bearing = map.current.getBearing()
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
  }, [stopRotation])

  useEffect(() => {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastInteractionRef.current
      if (idleTime > 30000 && !isRotatingRef.current && !isUpdatingPositionRef.current) {
        startRotation()
      }
    }, 1000)

    return () => clearInterval(checkIdle)
  }, [startRotation])

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
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
      stopRotation()
    }
  }, [mapType])

  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: currentCenter,
        zoom: 12,
        pitch: 60,
        bearing: -20,
        maxZoom: 22,
        attributionControl: true
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

      map.current.on('mousedown', handleUserInteraction)
      map.current.on('touchstart', handleUserInteraction)
      map.current.on('wheel', handleUserInteraction)
      map.current.on('drag', handleUserInteraction)

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

        if (mapType !== MapToggleEnum.RealTimeMode) {
          startRotation()
        }
      })
    }

    return () => {
      if (map.current) {
        if (drawRef.current) {
          try {
            map.current.removeControl(drawRef.current)
            drawRef.current = null
          } catch (e) {
            console.log('Draw control already removed')
          }
        }
        stopRotation()
        map.current.remove()
        map.current = null
      }
    }
  }, [mapType, handleUserInteraction, startRotation, stopRotation, currentCenter])

  useEffect(() => {
    if (map.current && position?.latitude && position?.longitude) {
      const newCenter: [number, number] = [position.longitude, position.latitude]
      setCurrentCenter(newCenter)
      updateMapPosition(position.latitude, position.longitude)
    }
  }, [position])

  const updateMeasurements = useCallback(() => {
    if (!drawRef.current) return
    
    const data = drawRef.current.getAll()
    setDrawnFeatures(data) // Store all drawn features

    // Calculate area for polygons
    const polygons = data.features.filter(f => f.geometry.type === 'Polygon')
    if (polygons.length > 0) {
      const area = polygons.reduce((sum, feature) => sum + turf.area(feature), 0)
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

    // Calculate distance for lines
    const lines = data.features.filter(f => f.geometry.type === 'LineString')
    if (lines.length > 0) {
      const distance = lines.reduce((sum, feature) => sum + turf.length(feature, { units: 'meters' }), 0)
      setLineDistance(Math.round(distance * 100) / 100)
    } else {
      setLineDistance(null)
    }
  }, [])

  useEffect(() => {
    if (!map.current) return
    
    if (drawRef.current) {
      map.current.off('draw.create', updateMeasurements)
      map.current.off('draw.delete', updateMeasurements)
      map.current.off('draw.update', updateMeasurements)
      try {
        map.current.removeControl(drawRef.current)
        drawRef.current = null
      } catch (e) {
        console.log('Draw control already removed')
      }
    }

    if (mapType === MapToggleEnum.DrawingMode) {
      drawRef.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
          line_string: true
        },
        // Remove defaultMode to allow multiple drawings without resetting
      })

      map.current.addControl(drawRef.current, 'top-right')
      
      // Restore previous drawings
      if (drawnFeatures.features.length > 0) {
        drawRef.current.set(drawnFeatures)
      }

      map.current.on('draw.create', updateMeasurements)
      map.current.on('draw.delete', updateMeasurements)
      map.current.on('draw.update', updateMeasurements)
    } else {
      setRoundedArea(null)
      setLineDistance(null)
    }

    return () => {
      if (map.current && drawRef.current) {
        map.current.off('draw.create', updateMeasurements)
        map.current.off('draw.delete', updateMeasurements)
        map.current.off('draw.update', updateMeasurements)
      }
    }
  }, [mapType, updateMeasurements, drawnFeatures])

  return (
    <div className="relative h carcasses-full w-full">
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
          <h3 className="font-bold text-center mb-2">Measurements</h3>
          {roundedArea && (
            <div className="text-center mb-2">
              <p className="text-xl font-semibold">{roundedArea}</p>
              <p className="text-sm">square {measurementUnit}</p>
            </div>
          )}
          {lineDistance && (
            <div className="text-center">
              <p className="text-xl font-semibold">{lineDistance}</p>
              <p className="text-sm">meters</p>
            </div>
          )}
          {!roundedArea && !lineDistance && (
            <p className="text-center">Draw polygons for area or lines for distance</p>
          )}
          <p className="text-xs mt-2">Multiple drawings supported</p>
        </div>
      )}
    </div>
  )
}
