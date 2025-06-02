'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import * as turf from '@turf/turf'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
// import { useMapToggle, MapToggleEnum } from '../map-toggle-context'; // REMOVED
import { MapData, PointMapData, RouteMapData, PlacesMapData } from '@/lib/types'; // IMPORT MapData
import turfBbox from '@turf/bbox'; // For bounding box calculations

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

interface MapboxProps {
  className?: string;
  mapTarget?: MapData | null;
}

export const Mapbox: React.FC<MapboxProps> = ({ className, mapTarget }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const rotationFrameRef = useRef<number | null>(null)
  const polygonLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lineLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lastInteractionRef = useRef<number>(Date.now())
  const isRotatingRef = useRef<boolean>(false)
  // const isUpdatingPositionRef = useRef<boolean>(false); // Was for old position prop logic
  // const geolocationWatchIdRef = useRef<number | null>(null); // Was for RealTimeMode
  const initializedRef = useRef<boolean>(false)
  const currentMapCenterRef = useRef<[number, number]>([-74.0060152, 40.7127281]) // Default initial center

  const drawingFeatures = useRef<any>(null)
  // const { mapType } = useMapToggle(); // REMOVED
  // const previousMapTypeRef = useRef<MapToggleEnum | null>(null); // REMOVED

  // Refs to keep track of current map additions to remove them later
  const currentMapMarkers = useRef<mapboxgl.Marker[]>([]);
  const currentRouteLayerId = 'route-geojson-layer';
  const currentRouteSourceId = 'route-geojson-source';

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
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(coordinates as [number, number])
            .addTo(map.current)
            
          polygonLabelsRef.current[id] = marker
        }
      } 
      else if (feature.geometry.type === 'LineString') {
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
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(midpoint as [number, number])
            .addTo(map.current)
            
          lineLabelsRef.current[id] = marker
        }
      }
    })  }, [formatMeasurement])

  // Handle map rotation
  const rotateMap = useCallback(() => {
    // isUpdatingPositionRef was removed
    if (map.current && isRotatingRef.current) {
      const bearing = map.current.getBearing()
      map.current.setBearing(bearing + 0.1)
      rotationFrameRef.current = requestAnimationFrame(rotateMap)
    }
  }, [])

  const startRotation = useCallback(() => {
    // isUpdatingPositionRef was removed
    if (!isRotatingRef.current && map.current) {
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

  // updateMapPosition was for RealTimeMode, will be replaced by mapTarget logic
  // const updateMapPosition = useCallback(async (latitude: number, longitude: number) => { ... }, []);

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

  // Set up geolocation watcher - REMOVED (was tied to RealTimeMode and mapType)
  // const setupGeolocationWatcher = useCallback(() => { ... }, [mapType, updateMapPosition]);

  // Capture map center changes
  const captureMapCenter = useCallback(() => {
    if (map.current) {
      const center = map.current.getCenter()
      currentMapCenterRef.current = [center.lng, center.lat]
    }
  }, [])

  // Set up idle rotation checker
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const idleTime = Date.now() - lastInteractionRef.current
      // isUpdatingPositionRef was removed, simplify condition
      if (idleTime > 30000 && !isRotatingRef.current) {
        startRotation()
      }
    }, 1000)

    return () => clearInterval(checkIdle)
  }, [startRotation])

  // Handle map type changes - REMOVED (this was the core of old logic based on mapType from useMapToggle)
  // useEffect(() => { ... old logic ... }, [mapType, ...]);

  // Initialize map (only once)
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: currentMapCenterRef.current,
        zoom: 12,
        pitch: 60,
        bearing: -20,
        maxZoom: 22,
        attributionControl: true
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

        // Initialize drawing tools if needed (e.g. if a prop enables it by default, but not mapType)
        // if (initialDrawingMode) { setupDrawingTools(); } // Example

        // Start rotation if no specific mapTarget initially or based on a prop
        // For now, we can let the mapTarget useEffect handle the view.
        // If mapTarget is null, it could start rotating.
        if (!mapTarget) { // Or some other condition for initial rotation
             startRotation();
        }

        initializedRef.current = true
        // setupGeolocationWatcher(); // REMOVED
      })
    }

    return () => { // Cleanup logic from original init
      if (map.current) {
        map.current.off('moveend', captureMapCenter);
        map.current.off('mousedown', handleUserInteraction);
        map.current.off('touchstart', handleUserInteraction);
        map.current.off('wheel', handleUserInteraction);
        map.current.off('drag', handleUserInteraction);
        map.current.off('zoom', handleUserInteraction);
        
        if (drawRef.current) {
          try {
            map.current.off('draw.create', updateMeasurementLabels)
            map.current.off('draw.delete', updateMeasurementLabels)
            map.current.off('draw.update', updateMeasurementLabels)
            map.current.removeControl(drawRef.current)
          } catch (e) {
            console.log('Draw control error on unmount', e)
          }
        }
        
        Object.values(polygonLabelsRef.current).forEach(marker => marker.remove())
        Object.values(lineLabelsRef.current).forEach(marker => marker.remove())
        
        stopRotation()
        map.current.remove()
        map.current = null
      }
      // Geolocation cleanup was here, removed as setupGeolocationWatcher is removed.
    }
  // Ensure dependencies are appropriate for a one-time initialization.
  // startRotation, stopRotation, captureMapCenter, handleUserInteraction, updateMeasurementLabels are callbacks
  // mapTarget is added to potentially influence initial setup based on its presence.
  }, [startRotation, stopRotation, captureMapCenter, handleUserInteraction, updateMeasurementLabels, mapTarget, setupDrawingTools]);
  // mapType removed from deps, setupDrawingTools added as it's called in init


  // Main effect to handle mapTarget changes
  useEffect(() => {
    if (!map.current || !initializedRef.current) return; // Ensure map is initialized

    // --- Clear previous map adornments ---
    currentMapMarkers.current.forEach(marker => marker.remove());
    currentMapMarkers.current = [];

    if (map.current.getLayer(currentRouteLayerId)) {
      map.current.removeLayer(currentRouteLayerId);
    }
    if (map.current.getSource(currentRouteSourceId)) {
      map.current.removeSource(currentRouteSourceId);
    }

    // --- Handle new mapTarget ---
    if (!mapTarget) {
      // If mapTarget is null, potentially reset to a default view or start rotation
      if (!isRotatingRef.current) { // Avoid restarting rotation if already rotating
        // map.current.flyTo({ center: currentMapCenterRef.current, zoom: 3 }); // Optional: reset view
        startRotation(); // Start idle rotation if no target
      }
      return;
    }

    // If there's a mapTarget, stop idle rotation
    stopRotation();

    switch (mapTarget.type) {
      case 'Point':
        const pointData = mapTarget as PointMapData;
        map.current.flyTo({ center: pointData.coordinates, zoom: pointData.zoom || 14, essential: true });
        const pointMarker = new mapboxgl.Marker()
          .setLngLat(pointData.coordinates)
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(pointData.label || pointData.placeName || 'Selected Location'))
          .addTo(map.current);
        currentMapMarkers.current.push(pointMarker);
        break;

      case 'Route':
        const routeData = mapTarget as RouteMapData;
        if (routeData.geojson && map.current) {
          try {
            map.current.addSource(currentRouteSourceId, {
              type: 'geojson',
              data: routeData.geojson,
            });
            map.current.addLayer({
              id: currentRouteLayerId,
              type: 'line',
              source: currentRouteSourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#3887be', 'line-width': 5, 'line-opacity': 0.75 },
            });
            const bounds = turfBbox(routeData.geojson);
            map.current.fitBounds(bounds as [number,number,number,number], { padding: 50, essential: true });
          } catch (error) {
            console.error("Error processing route GeoJSON:", error, routeData.geojson);
          }
        }
        break;

      case 'Places':
        const placesData = mapTarget as PlacesMapData;
        if (placesData.places && placesData.places.length > 0 && map.current) {
          const bounds = new LngLatBounds();
          placesData.places.forEach(place => {
            if (place.coordinates) {
              const marker = new mapboxgl.Marker()
                .setLngLat(place.coordinates)
                .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(place.label || place.placeName || 'Nearby Place'))
                .addTo(map.current!);
              currentMapMarkers.current.push(marker);
              bounds.extend(place.coordinates);
            }
          });
          if (!bounds.isEmpty()) {
            map.current.fitBounds(bounds, { padding: 60, essential: true });
          } else if (placesData.places.length === 1 && placesData.places[0].coordinates) {
            map.current.flyTo({ center: placesData.places[0].coordinates, zoom: 14, essential: true });
          }
        }
        break;

      default:
        // This is a way to satisfy TypeScript that mapTarget is handled exhaustively if MapData is a union.
        // If mapTarget can be other known types not handled, they'd fall here.
        // If mapTarget is truly of an unknown type, it's an issue.
        const exhaustiveCheck: never = mapTarget;
        console.warn("Unhandled mapTarget type:", exhaustiveCheck);
        break;
    }
  }, [mapTarget, startRotation, stopRotation]); // React to changes in mapTarget prop and rotation controls

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className={`h-full w-full overflow-hidden rounded-l-lg ${className}`} // Apply className to the actual map container
      />
    </div>
  )
}