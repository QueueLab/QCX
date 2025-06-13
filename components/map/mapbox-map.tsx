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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

export const Mapbox: React.FC<{ position?: { latitude: number; longitude: number; } }> = ({ position }) => {
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
  const currentMapCenterRef = useRef<{ center: [number, number]; zoom: number; pitch: number }>({ center: [position?.longitude ?? 0, position?.latitude ?? 0], zoom: 2, pitch: 0 });
  const drawingFeatures = useRef<any>(null)
  const { mapType, setMapType } = useMapToggle() // Get setMapType
  const { mapData, setMapData } = useMapData(); // Consume the new context, get setMapData
  const { viewport } = mapData; // mapInstance is no longer in mapData, viewport is used for initial state
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
    
    // Restore drawings:

    // Prioritize mapData.drawnFeatures from context first.
    // This is crucial for restoring drawings when Mapbox component remounts.
    if (mapData.drawnFeatures && mapData.drawnFeatures.length > 0) {
      mapData.drawnFeatures.forEach((featureData: any) => {
        // Construct a valid GeoJSON Feature object for MapboxDraw.add().
        const feature = {
          id: featureData.id,
          type: 'Feature' as const, // GeoJSON Feature type
          properties: {
            measurement: featureData.measurement
          },
          geometry: featureData.geometry
        };
        if (drawRef.current) {
          drawRef.current.add(feature);
        }
      });
      // Update labels for restored features
      setTimeout(updateMeasurementLabels, 100);

    } else if (drawingFeatures.current && drawingFeatures.current.features.length > 0) {
      // Fallback to drawingFeatures.current.
      drawingFeatures.current.features.forEach((feature: any) => {
        if (drawRef.current) {
          drawRef.current.add(feature);
        }
      });
      // Update labels for restored features
      setTimeout(updateMeasurementLabels, 100);
    }
  }, [updateMeasurementLabels, mapData.drawnFeatures])

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
      const newViewport = { center: [center.lng, center.lat] as [number, number], zoom, pitch, bearing };
      currentMapCenterRef.current = { center: newViewport.center, zoom, pitch }; // Keep this for local use if needed
      setMapData(prev => ({ ...prev, viewport: newViewport }));
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

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) { // If map already exists or container not ready, do nothing
      return;
    }

    // Determine initial viewport state
    // Prioritize viewport from context, then local ref, then hardcoded defaults.
    let initialPitch = 0;
    let initialBearing = 0;

    if (viewport) { // mapData.viewport
        currentMapCenterRef.current = { // Update local ref to match context if context is source
            center: viewport.center,
            zoom: viewport.zoom,
            pitch: viewport.pitch
        };
        initialPitch = viewport.pitch;
        initialBearing = viewport.bearing;
    } else if (currentMapCenterRef.current) {
        initialPitch = currentMapCenterRef.current.pitch;
        // currentMapCenterRef doesn't store bearing, so it defaults to 0 unless set otherwise
    }

    const initialViewportState = viewport || {
        center: currentMapCenterRef.current.center,
        zoom: currentMapCenterRef.current.zoom,
        pitch: initialPitch,
        bearing: initialBearing,
    };

    // If mapData.viewport was undefined, save the derived initialViewportState (which might be from defaults) to context.
    if (!viewport && mapContainer.current) { // Check mapContainer to ensure this isn't an effect of unmounting
        setMapData(prev => ({ ...prev, viewport: initialViewportState }));
    }

    const newMap = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: initialViewportState.center,
      zoom: initialViewportState.zoom,
      pitch: initialViewportState.pitch,
      bearing: initialViewportState.bearing,
      maxZoom: 22,
      attributionControl: true,
    });

    map.current = newMap; // Set local ref to the new map instance

    // Event listeners for the new map
    newMap.on('moveend', captureMapCenter);
    newMap.on('mousedown', handleUserInteraction);
    newMap.on('touchstart', handleUserInteraction);
    newMap.on('wheel', handleUserInteraction);
    newMap.on('drag', handleUserInteraction);
    newMap.on('zoom', handleUserInteraction);

    newMap.on('load', () => {
      if (!map.current) return; // Should be newMap, but map.current is now set

      map.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      map.current.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      // Restore drawings using setupDrawingTools, which reads from mapData.drawnFeatures
      if (mapType === MapToggleEnum.DrawingMode) {
        setupDrawingTools();
      }

      if (mapType !== MapToggleEnum.RealTimeMode) {
        startRotation();
      }

      initializedRef.current = true;
      setIsMapLoaded(true);
      setupGeolocationWatcher();
    });

    newMap.addControl(new mapboxgl.NavigationControl(), 'top-left');

    return () => {
      // Cleanup logic: always remove the map instance on unmount
      if (map.current) {
        map.current.off('moveend', captureMapCenter);
        map.current.off('mousedown', handleUserInteraction);
        map.current.off('touchstart', handleUserInteraction);
        map.current.off('wheel', handleUserInteraction);
        map.current.off('drag', handleUserInteraction);
        map.current.off('zoom', handleUserInteraction);

        // Cleanup MapboxDraw if it exists
        if (drawRef.current) {
          try {
            // Check if map still has the control before removing
            if (map.current.hasControl(drawRef.current as mapboxgl.IControl)) {
               map.current.off('draw.create', updateMeasurementLabels);
               map.current.off('draw.delete', updateMeasurementLabels);
               map.current.off('draw.update', updateMeasurementLabels);
               map.current.removeControl(drawRef.current);
            }
          } catch (e) {
            console.log('Error during drawRef cleanup on map remove:', e);
          }
          drawRef.current = null;
        }

        // Clean up any existing labels
        Object.values(polygonLabelsRef.current).forEach(marker => marker.remove());
        Object.values(lineLabelsRef.current).forEach(marker => marker.remove());
        polygonLabelsRef.current = {};
        lineLabelsRef.current = {};

        stopRotation();
        map.current.remove(); // Destroy the map instance
      }
      
      map.current = null; // Nullify the local ref
      initializedRef.current = false; // Reset initialization status
      setIsMapLoaded(false);

      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
        geolocationWatchIdRef.current = null;
      }
    };
  }, [
    // Key dependencies that trigger re-creation of the map IF THE COMPONENT KEY CHANGES
    // For a map that's always new on mount, these might not be strictly necessary
    // if the component itself is remounted (e.g. via a key change on parent).
    // However, if this useEffect is meant to react to context changes to re-init the map
    // (which it's not, with current always-new-map logic), then they would be.
    // For now, keep relevant ones that define initial state or behavior.
    setMapData, // To save initial viewport if derived from defaults
    viewport, // Used for initial map state
    mapType, // Determines initial setup like drawing tools, rotation
    // Callbacks: these should be stable via useCallback
    handleUserInteraction, 
    startRotation, 
    stopRotation, 
    updateMeasurementLabels, 
    setupGeolocationWatcher, 
    captureMapCenter, 
    setupDrawingTools,
    setIsMapLoaded
    // mapData.drawnFeatures is used by setupDrawingTools, which is a dep.
  ]);

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
  // This useEffect was problematic. The main useEffect already has a cleanup function.
  // Consolidating cleanup into the main useEffect's return statement.
  // If there's specific cleanup for longPressTimerRef, it should be handled separately if its lifecycle is different.
  useEffect(() => {
    // Cleanup for longPressTimerRef if component unmounts
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount.


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