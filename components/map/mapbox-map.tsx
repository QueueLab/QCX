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
      currentMapCenterRef.current = { center: [center.lng, center.lat], zoom, pitch };
    }
  }, [])

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
      let initialZoom = 2;
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        initialZoom = 1.3;
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: currentMapCenterRef.current.center,
        zoom: currentMapCenterRef.current.zoom,
        pitch: currentMapCenterRef.current.pitch,
        bearing: 0,
        maxZoom: 22,
        attributionControl: true,
        preserveDrawingBuffer: true
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

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
      // console.log("Mapbox.tsx: Received new targetPosition from context:", mapData.targetPosition);
      // targetPosition is LngLatLike, which can be [number, number]
      // updateMapPosition expects (latitude, longitude)
      const [lng, lat] = mapData.targetPosition as [number, number]; // Assuming LngLatLike is [lng, lat]
      if (typeof lat === 'number' && typeof lng === 'number') {
        updateMapPosition(lat, lng);
      } else {
        // console.error("Mapbox.tsx: Invalid targetPosition format in mapData", mapData.targetPosition);
      }
    }
    // TODO: Handle mapData.mapFeature for drawing routes, polygons, etc. in a future step.
    // For example:
    // if (mapData.mapFeature && mapData.mapFeature.route_geometry && typeof drawRoute === 'function') {
    //   drawRoute(mapData.mapFeature.route_geometry); // Implement drawRoute function if needed
    // }
  }, [mapData.targetPosition, mapData.mapFeature, updateMapPosition]);

  // Effect to handle GeoJSON data updates
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;
    const source = mapInstance.getSource('geojson-data');

    // If GeoJSON data is present, add or update the source and layers
    if (mapData.geojson) {
      if (source) {
        (source as mapboxgl.GeoJSONSource).setData(mapData.geojson as any);
      } else {
        mapInstance.addSource('geojson-data', {
          type: 'geojson',
          data: mapData.geojson as any,
        });

        // Add layer for points
        mapInstance.addLayer({
          id: 'geojson-points',
          type: 'circle',
          source: 'geojson-data',
          paint: {
            'circle-radius': 8,
            'circle-color': '#007cbf',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
          filter: ['==', '$type', 'Point'],
        });

        // Add layer for lines
        mapInstance.addLayer({
          id: 'geojson-lines',
          type: 'line',
          source: 'geojson-data',
          paint: {
            'line-color': '#ff4500',
            'line-width': 3,
          },
          filter: ['==', '$type', 'LineString'],
        });
      }
    } else {
      // If no GeoJSON data, remove layers and source if they exist
      if (mapInstance.getLayer('geojson-points')) mapInstance.removeLayer('geojson-points');
      if (mapInstance.getLayer('geojson-lines')) mapInstance.removeLayer('geojson-lines');
      if (source) mapInstance.removeSource('geojson-data');
    }
  }, [mapData.geojson]);

  // Effect to execute map commands with feedback
  useEffect(() => {
    if (!map.current || !mapData.mapCommands || mapData.mapCommands.length === 0) return;

    const mapInstance = map.current;
    let executionError: string | undefined;

    try {
      mapData.mapCommands.forEach(command => {
        switch (command.command) {
          case 'flyTo':
            mapInstance.flyTo(command.params);
            break;
          case 'easeTo':
            mapInstance.easeTo(command.params);
            break;
          case 'fitBounds':
            const { bounds, options } = command.params;
            mapInstance.fitBounds(bounds, options || {});
            break;
          case 'setCenter':
            if (command.params.center) {
              mapInstance.setCenter(command.params.center);
            }
            break;
          case 'setZoom':
            if (command.params.zoom !== undefined) {
              mapInstance.setZoom(command.params.zoom);
            }
            break;
          case 'setPitch':
            if (command.params.pitch !== undefined) {
              mapInstance.setPitch(command.params.pitch);
            }
            break;
          case 'setBearing':
            if (command.params.bearing !== undefined) {
              mapInstance.setBearing(command.params.bearing);
            }
            break;
          default:
            console.warn(`Unknown map command: ${command.command}`);
        }
      });

      // Capture feedback after commands complete
      const feedbackHandler = () => {
        const center = mapInstance.getCenter();
        const bounds = mapInstance.getBounds();
        
        const feedback = {
          success: !executionError,
          currentBounds: [
            [bounds.getWest(), bounds.getSouth()],
            [bounds.getEast(), bounds.getNorth()]
          ] as [[number, number], [number, number]],
          currentCenter: [center.lng, center.lat] as [number, number],
          currentZoom: mapInstance.getZoom(),
          currentPitch: mapInstance.getPitch(),
          currentBearing: mapInstance.getBearing(),
          error: executionError,
          timestamp: Date.now(),
        };

        console.log('📍 Map feedback:', feedback);

        // Send feedback via callback if provided
        if (mapData.feedbackCallback) {
          mapData.feedbackCallback(feedback);
        }

        // Store feedback in context
        setMapData(prev => ({ 
          ...prev, 
          mapStateFeedback: feedback,
          mapCommands: null, // Clear commands after execution
        }));
      };

      // Wait for map to finish moving
      mapInstance.once('moveend', feedbackHandler);
      
      // Fallback timeout in case moveend doesn't fire
      setTimeout(() => {
        if (mapInstance.isMoving && mapInstance.isMoving()) {
          return; // Still moving, wait for moveend
        }
        // If not moving, trigger feedback immediately
        mapInstance.off('moveend', feedbackHandler);
        feedbackHandler();
      }, 100);

    } catch (error) {
      executionError = error instanceof Error ? error.message : 'Unknown execution error';
      console.error('❌ Map command execution error:', error);
      
      // Send error feedback
      const errorFeedback = {
        success: false,
        error: executionError,
        timestamp: Date.now(),
      };

      if (mapData.feedbackCallback) {
        mapData.feedbackCallback(errorFeedback);
      }

      setMapData(prev => ({ 
        ...prev, 
        mapStateFeedback: errorFeedback,
        mapCommands: null,
      }));
    }

  }, [mapData.mapCommands, mapData.feedbackCallback, setMapData]);}

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
