'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import * as turf from '@turf/turf'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
// import { useMapToggle, MapToggleEnum } from '../map-toggle-context'; // Removed
import { MapUpdateContent } from '@/lib/types'; // Import MapUpdateContent

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

export const Mapbox: React.FC<{
  position?: { latitude: number; longitude: number; };
  mapUpdate?: MapUpdateContent; // New prop
}> = ({ position, mapUpdate }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  // const drawRef = useRef<MapboxDraw | null>(null); // Removed
  const rotationFrameRef = useRef<number | null>(null)
  // const polygonLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({}); // Removed
  // const lineLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({}); // Removed
  const lastInteractionRef = useRef<number>(Date.now())
  const isRotatingRef = useRef<boolean>(false)
  const isUpdatingPositionRef = useRef<boolean>(false)
  // const geolocationWatchIdRef = useRef<number | null>(null); // Removed
  const initializedRef = useRef<boolean>(false)
  const currentMapCenterRef = useRef<[number, number]>([
    position?.longitude ?? -74.0060152,
    position?.latitude ?? 40.7127281
  ])
  // const drawingFeatures = useRef<any>(null); // Removed
  // const { mapType } = useMapToggle(); // Removed
  // const previousMapTypeRef = useRef<MapToggleEnum | null>(null); // Removed

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

  // Create measurement labels for all features - REMOVED
  // const updateMeasurementLabels = useCallback(() => { ... }, [formatMeasurement]);

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
          // if (mapType === MapToggleEnum.RealTimeMode) { // Removed mapType check
          startRotation() // Consider if rotation should always start or be conditional
          // }
          isUpdatingPositionRef.current = false
        }, 500)
      } catch (error) {
        console.error('Error updating map position:', error)
        isUpdatingPositionRef.current = false
      }
    }
  }, [startRotation, stopRotation]) // Removed mapType

  // Set up drawing tools - REMOVED
  // const setupDrawingTools = useCallback(() => { ... }, [updateMeasurementLabels]);

  // Set up geolocation watcher - REMOVED / DISABLED
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
      if (idleTime > 30000 && !isRotatingRef.current && !isUpdatingPositionRef.current) {
        startRotation()
      }
    }, 1000)

    return () => clearInterval(checkIdle)
  }, [startRotation])

  // Handle map type changes - REMOVED / SIMPLIFIED
  // useEffect(() => { ... }, [mapType, ...]);


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

        // Initialize drawing tools based on initial mode - REMOVED
        // if (mapType === MapToggleEnum.DrawingMode) {
        //   setupDrawingTools()
        // }

        // If not in real-time mode, start rotation - SIMPLIFIED: always start rotation initially
        // if (mapType !== MapToggleEnum.RealTimeMode) { // Removed mapType check
        startRotation()
        // }

        initializedRef.current = true
        // setupGeolocationWatcher(); // Geolocation watcher is disabled
      })
    }

    return () => {
      if (map.current) {
        map.current.off('moveend', captureMapCenter)
        
        // if (drawRef.current) { // Removed drawRef logic
        //   try {
        //     map.current.off('draw.create', updateMeasurementLabels)
        //     map.current.off('draw.delete', updateMeasurementLabels)
        //     map.current.off('draw.update', updateMeasurementLabels)
        //     map.current.removeControl(drawRef.current)
        //   } catch (e) {
        //     console.log('Draw control already removed')
        //   }
        // }
        
        // Clean up any existing labels - REMOVED
        // Object.values(polygonLabelsRef.current).forEach(marker => marker.remove());
        // Object.values(lineLabelsRef.current).forEach(marker => marker.remove());
        
        stopRotation()
        map.current.remove()
        map.current = null
      }
      
      // if (geolocationWatchIdRef.current !== null) { // Removed geolocation logic
      //   navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
      //   geolocationWatchIdRef.current = null
      // }
    }
  }, [ // Simplified dependencies
    handleUserInteraction, 
    startRotation, 
    stopRotation, 
    captureMapCenter
    // Removed mapType, updateMeasurementLabels, setupGeolocationWatcher, setupDrawingTools
  ])

  // Handle position updates from props - This can be simplified or removed if 'position' prop is not primary driver
  useEffect(() => {
    // This effect might conflict with mapUpdate if both try to control position.
    // For now, keeping it but it might need to be re-evaluated.
    // It was originally tied to RealTimeMode.
    if (map.current && position?.latitude && position?.longitude /* && mapType === MapToggleEnum.RealTimeMode */) { // mapType check removed
      updateMapPosition(position.latitude, position.longitude)
    }
  }, [position, updateMapPosition /*, mapType */]) // mapType removed

  // Refs for dynamic sources and layers
  const dynamicFeaturesSourceId = 'dynamic-geojson-features';
  const dynamicFeaturesLayerId = 'dynamic-geojson-layer-points';
  const dynamicRouteSourceId = 'dynamic-geojson-route';
  const dynamicRouteLayerId = 'dynamic-geojson-layer-route';

  useEffect(() => {
    if (!map.current || !mapUpdate || !initializedRef.current) {
      return;
    }

    // Helper to remove existing dynamic source and layer
    const removeDynamicLayerAndSource = (sourceId: string, layerId: string) => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    };

    switch (mapUpdate.mapAction) {
      case 'flyTo':
        map.current.flyTo({
          center: [mapUpdate.coordinates.longitude, mapUpdate.coordinates.latitude],
          zoom: mapUpdate.zoom || 14,
          essential: true,
        });
        break;

      case 'drawFeatures':
        removeDynamicLayerAndSource(dynamicFeaturesSourceId, dynamicFeaturesLayerId);
        removeDynamicLayerAndSource(dynamicRouteSourceId, dynamicRouteLayerId); // Clear route if drawing features

        map.current.addSource(dynamicFeaturesSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: mapUpdate.features,
          },
        });

        map.current.addLayer({
          id: dynamicFeaturesLayerId,
          type: 'circle',
          source: dynamicFeaturesSourceId,
          paint: {
            'circle-radius': 8,
            'circle-color': '#FF0000',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#FFFFFF',
          },
        });

        if (mapUpdate.features.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          mapUpdate.features.forEach(feature => {
            if (feature.geometry.type === 'Point') {
              bounds.extend(feature.geometry.coordinates as [number, number]);
            }
          });
          if (!bounds.isEmpty()) {
              map.current.fitBounds(bounds, { padding: 100, maxZoom: 15 });
          }
        }
        break;

      case 'drawRoute':
        removeDynamicLayerAndSource(dynamicRouteSourceId, dynamicRouteLayerId);
        removeDynamicLayerAndSource(dynamicFeaturesSourceId, dynamicFeaturesLayerId); // Clear features if drawing route

        map.current.addSource(dynamicRouteSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: mapUpdate.routeGeometry,
            properties: {},
          },
        });

        map.current.addLayer({
          id: dynamicRouteLayerId,
          type: 'line',
          source: dynamicRouteSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#007cbf',
            'line-width': 6,
            'line-opacity': 0.75,
          },
        });

        if (mapUpdate.routeGeometry && mapUpdate.routeGeometry.coordinates && mapUpdate.routeGeometry.coordinates.length > 0) {
          const routeCoords = mapUpdate.routeGeometry.coordinates as [number, number][];
          const bounds = routeCoords.reduce((currentBounds, coord) => {
              return currentBounds.extend(coord);
          }, new mapboxgl.LngLatBounds(routeCoords[0], routeCoords[0]));
          if (!bounds.isEmpty()){
              map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
          }
        }
        break;

      case 'showMapLink':
        if (mapUpdate.placeName && (mapUpdate.interactiveMapUrl || mapUpdate.mapUrl)) {
          const urlToShow = mapUpdate.interactiveMapUrl || mapUpdate.mapUrl;
          console.log(`Map link generated for ${mapUpdate.placeName}: ${urlToShow}`);
          toast.info(<span>Map for <a href={urlToShow} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{mapUpdate.placeName || 'location'}</a> ready.</span>, { autoClose: 10000 });
        }
        break;
    }
  }, [mapUpdate, map, initializedRef]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="h-full w-full overflow-hidden rounded-l-lg"
      />
    </div>
  )
}