'use client'

import { useEffect, useRef, useCallback } from 'react' // Removed useState
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import * as turf from '@turf/turf'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useMapToggle, MapToggleEnum } from '../map-toggle-context'
import { useMapData } from './map-data-context'; // Add this import
import { useMapLoading } from '../map-loading-context'; // Import useMapLoading
import { useMap } from './map-context'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

export const Mapbox: React.FC<{ position?: { latitude: number; longitude: number; } }> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const { setMap } = useMap()
  const drawRef = useRef<MapboxDraw | null>(null)
  const rotationFrameRef = useRef<number | null>(null)
  const polygonLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lineLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lastInteractionRef = useRef<number>(Date.now())
  const isRotatingRef = useRef<boolean>(false)
  const isUpdatingPositionRef = useRef<boolean>(false)
  const geolocationWatchIdRef = useRef<number | null>(null)
  const initializedRef = useRef<boolean>(false)
  const currentMapCenterRef = useRef<{ center: [number, number]; zoom: number; pitch: number }>({ center: [position?.longitude ?? 0, position?.latitude ?? 0], zoom: 2, pitch: 0 });
  const drawingFeatures = useRef<any>(null)
  const { mapType, setMapType } = useMapToggle() // Get setMapType
  const { mapData, setMapData } = useMapData(); // Consume the new context, get setMapData
  const { setIsMapLoaded } = useMapLoading(); // Get setIsMapLoaded from context
  const previousMapTypeRef = useRef<MapToggleEnum | null>(null)

  // Refs for long-press functionality
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  // const [isMapLoaded, setIsMapLoaded] = useState(false); // Removed local state

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
    const currentDrawnFeatures: Array<{ id: string; type: 'Polygon' | 'LineString'; measurement: string; geometry: any }> = []

    features.forEach(feature => {
      const id = feature.id as string
      let featureType: 'Polygon' | 'LineString' | null = null;
      let measurement = '';

      if (feature.geometry.type === 'Polygon') {
        featureType = 'Polygon';
        // Calculate area for polygons
        const area = turf.area(feature)
        const formattedArea = formatMeasurement(area, true)
        measurement = formattedArea;
        
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
        el.style.color = '#333333' // Added darker color
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
        el.style.pointerEvents = 'none'
        el.textContent = formattedArea
        
        // Add marker for the label





        if (map.current) {
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(coordinates as [number, number])
            .addTo(map.current)
            
          polygonLabelsRef.current[id] = marker
        }
      } 
      else if (feature.geometry.type === 'LineString') {
        featureType = 'LineString';
        // Calculate length for lines
        const length = turf.length(feature, { units: 'kilometers' }) * 1000 // Convert to meters
        const formattedLength = formatMeasurement(length, false)
        measurement = formattedLength;
        
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
        el.style.color = '#333333' // Added darker color
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
        el.style.pointerEvents = 'none'
        el.textContent = formattedLength
        
        // Add marker for the label
        if (map.current) {
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(midpoint as [number, number])
            .addTo(map.current)
            
          lineLabelsRef.current[id] = marker
        }
      }

      if (featureType && id && measurement && feature.geometry) {
        currentDrawnFeatures.push({
          id,
          type: featureType,
          measurement,
          geometry: feature.geometry,
        });
      }
    })

    setMapData(prevData => ({ ...prevData, drawnFeatures: currentDrawnFeatures }))
  }, [formatMeasurement, setMapData])

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
      currentMapCenterRef.current.center = [center.lng, center.lat]
    }
  }, [stopRotation])

  const updateMapPosition = useCallback(async (latitude: number, longitude: number) => {
    if (map.current && !isUpdatingPositionRef.current) {
      isUpdatingPositionRef.current = true
      stopRotation()
      
      try {
        // Update our current map center ref
        currentMapCenterRef.current.center = [longitude, latitude]
        
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

    const success = async (geoPos: GeolocationPosition) => {
      await updateMapPosition(geoPos.coords.latitude, geoPos.coords.longitude)
    }

    const error = (positionError: GeolocationPositionError) => {
      console.error('Geolocation Error:', positionError.message)
      toast.error(`Location error: ${positionError.message}`)
    }
    
    geolocationWatchIdRef.current = navigator.geolocation.watchPosition(success, error)
  }, [mapType, updateMapPosition])

  // Capture map center changes
  const captureMapCenter = useCallback(() => {
    if (map.current) {
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      const pitch = map.current.getPitch();
      const bearing = map.current.getBearing();
      currentMapCenterRef.current = { center: [center.lng, center.lat], zoom, pitch };

      setMapData(prevData => ({
        ...prevData,
        cameraState: {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          pitch,
          bearing
        }
      }));
    }
  }, [setMapData])

  // Set up idle rotation checker
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastInteractionRef.current
      if (idleTime > 30000 && !isRotatingRef.current && !isUpdatingPositionRef.current) {
        startRotation()
      }
    }, 1000)

    return () => clearInterval(checkIdle)
  }, [startRotation])

  // Handle map type changes
  useEffect(() => {
    // Store previous map type to detect changes
    const isMapTypeChanged = previousMapTypeRef.current !== mapType
    previousMapTypeRef.current = mapType
    
    // Only proceed if map is initialized
    if (!map.current || !initializedRef.current) return
    
    // If we're switching modes, capture the current map center
    if (isMapTypeChanged) {
      captureMapCenter()
      
      // Handle geolocation setup based on mode
      setupGeolocationWatcher()
      
      // Handle draw controls based on mode
      if (mapType === MapToggleEnum.DrawingMode) {
        // If switching to drawing mode, setup drawing tools
        setupDrawingTools()
      } else {
        // If switching from drawing mode, remove drawing tools but save features
        if (drawRef.current) {
          // Save current drawings before removing control
          drawingFeatures.current = drawRef.current.getAll()
          
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
      }
    }

    return () => {
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
        geolocationWatchIdRef.current = null
      }
    }
  }, [mapType, updateMeasurementLabels, setupGeolocationWatcher, captureMapCenter, setupDrawingTools])

  // Initialize map (only once)
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      let initialCenter: [number, number] = [position?.longitude ?? 0, position?.latitude ?? 0];
      let initialZoom = 2;
      let initialPitch = 0;
      let initialBearing = 0;

      if (mapData.cameraState) {
        const { center, range, tilt, heading, zoom, pitch, bearing } = mapData.cameraState;
        initialCenter = [center.lng, center.lat];
        if (zoom !== undefined) {
          initialZoom = zoom;
        } else if (range !== undefined) {
          initialZoom = Math.log2(40000000 / range);
        }
        initialPitch = pitch ?? tilt ?? 0;
        initialBearing = bearing ?? heading ?? 0;
      } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
        initialZoom = 1.3;
      }

      currentMapCenterRef.current = { center: initialCenter, zoom: initialZoom, pitch: initialPitch };

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: initialCenter,
        zoom: initialZoom,
        pitch: initialPitch,
        bearing: initialBearing,
        maxZoom: 22,
        attributionControl: true,
        preserveDrawingBuffer: true
      })

      if (window.innerWidth > 768) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')
      }

      // Register event listeners
      map.current.on('moveend', captureMapCenter)
      map.current.on('mousedown', handleUserInteraction)
      map.current.on('touchstart', handleUserInteraction)
      map.current.on('wheel', handleUserInteraction)
      map.current.on('drag', handleUserInteraction)
      map.current.on('zoom', handleUserInteraction)

      map.current.on('load', () => {
        if (!map.current) return
        setMap(map.current) // Set map instance in context

        // Add terrain and sky
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

        // Initialize drawing tools based on initial mode
        if (mapType === MapToggleEnum.DrawingMode) {
          setupDrawingTools()
        }

        // If not in real-time mode, start rotation
        if (mapType !== MapToggleEnum.RealTimeMode) {
          startRotation()
        }

        initializedRef.current = true
        setIsMapLoaded(true) // Set map loaded state to true
        setupGeolocationWatcher()
      })
    }

    return () => {
      if (map.current) {
        map.current.off('moveend', captureMapCenter)
        
        if (drawRef.current) {
          try {
            map.current.off('draw.create', updateMeasurementLabels)
            map.current.off('draw.delete', updateMeasurementLabels)
            map.current.off('draw.update', updateMeasurementLabels)
            map.current.removeControl(drawRef.current)
          } catch (e) {
            console.log('Draw control already removed')
          }
        }
        
        // Clean up any existing labels
        Object.values(polygonLabelsRef.current).forEach(marker => marker.remove())
        Object.values(lineLabelsRef.current).forEach(marker => marker.remove())
        
        stopRotation()
        setIsMapLoaded(false) // Reset map loaded state on cleanup
        setMap(null) // Clear map instance from context
        map.current.remove()
        map.current = null
      }
      
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
        geolocationWatchIdRef.current = null
      }
    }
  }, [
    handleUserInteraction, 
    startRotation, 
    stopRotation, 
    mapType, 
    updateMeasurementLabels, 
    setupGeolocationWatcher, 
    captureMapCenter, 
    setupDrawingTools,
    setIsMapLoaded,
    setMap
  ])

  // Handle position updates from props
  useEffect(() => {
    if (map.current && position?.latitude && position?.longitude && mapType === MapToggleEnum.RealTimeMode) {
      updateMapPosition(position.latitude, position.longitude)
    }
  }, [position, updateMapPosition, mapType])

  // Effect to handle map updates from MapDataContext
  useEffect(() => {
    if (mapData.targetPosition && map.current) {
      const { lat, lng } = mapData.targetPosition;
      if (typeof lat === 'number' && typeof lng === 'number') {
        updateMapPosition(lat, lng);
      }
    }
    // TODO: Handle mapData.mapFeature for drawing routes, polygons, etc. in a future step.
    // For example:
    // if (mapData.mapFeature && mapData.mapFeature.route_geometry && typeof drawRoute === 'function') {
    //   drawRoute(mapData.mapFeature.route_geometry); // Implement drawRoute function if needed
    // }
  }, [mapData.targetPosition, mapData.mapFeature, updateMapPosition]);

  // Effect to synchronize markers from MapDataContext
  useEffect(() => {
    if (!map.current || !initializedRef.current) return;

    // Remove markers that are no longer in mapData
    const currentMarkerIds = new Set(mapData.markers?.map(m => m.id) || []);
    Object.keys(markersRef.current).forEach(id => {
      if (!currentMarkerIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers from mapData
    mapData.markers?.forEach(markerData => {
      if (!markersRef.current[markerData.id]) {
        const marker = new mapboxgl.Marker()
          .setLngLat([markerData.longitude, markerData.latitude])
          .setPopup(markerData.title ? new mapboxgl.Popup().setHTML(`<h3>${markerData.title}</h3>`) : null)
          .addTo(map.current!);
        markersRef.current[markerData.id] = marker;
      } else {
        markersRef.current[markerData.id].setLngLat([markerData.longitude, markerData.latitude]);
      }
    });
  }, [mapData.markers]);

  // Long-press handlers
  const handleMouseDown = useCallback(() => {
    // Only activate long press if not in real-time mode (as that mode has its own interactions)
    if (mapType === MapToggleEnum.RealTimeMode) return;

    isMouseDownRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      if (isMouseDownRef.current && map.current && mapType !== MapToggleEnum.DrawingMode) {
        console.log('Long press detected, activating drawing mode.');
        setMapType(MapToggleEnum.DrawingMode);
      }
    }, 3000); // 3-second delay for long press
  }, [mapType, setMapType]);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Cleanup for the main useEffect
  useEffect(() => {
    // ... existing useEffect logic ...
    return () => {
      // ... existing cleanup logic ...
      if (longPressTimerRef.current) { // Cleanup timer on component unmount
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      // ... existing cleanup logic for map and geolocation ...
      if (map.current) {
        map.current.off('moveend', captureMapCenter)

        if (drawRef.current) {
          try {
            map.current.off('draw.create', updateMeasurementLabels)
            map.current.off('draw.delete', updateMeasurementLabels)
            map.current.off('draw.update', updateMeasurementLabels)
            map.current.removeControl(drawRef.current)
          } catch (e) {
            console.log('Draw control already removed')
          }
        }

        Object.values(polygonLabelsRef.current).forEach(marker => marker.remove())
        Object.values(lineLabelsRef.current).forEach(marker => marker.remove())

        stopRotation()
        setIsMapLoaded(false)
        setMap(null)
        map.current.remove()
        map.current = null
      }

      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
        geolocationWatchIdRef.current = null
      }
    };
  }, [
    handleUserInteraction,
    startRotation,
    stopRotation,
    mapType, // mapType is already here, good.
    updateMeasurementLabels,
    setupGeolocationWatcher,
    captureMapCenter,
    setupDrawingTools,
    setIsMapLoaded,
    setMap
  ]);


  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="h-full w-full overflow-hidden rounded-l-lg"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Clear timer if mouse leaves container while pressed
      />
    </div>
  )
}
