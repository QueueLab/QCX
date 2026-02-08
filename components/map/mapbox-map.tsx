'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import CircleMode from './draw-modes/circle-mode'
import * as turf from '@turf/turf'
import tzlookup from 'tz-lookup'
import { toast } from 'sonner'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { useMapToggle, MapToggleEnum } from '../map-toggle-context'
import { useMapData } from './map-data-context';
import { useMapLoading } from '../map-loading-context';
import { useMap } from './map-context'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

export const Mapbox: React.FC<{ position?: { latitude: number; longitude: number; } }> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const { setMap } = useMap()
  const drawRef = useRef<MapboxDraw | null>(null)
  const navControlRef = useRef<mapboxgl.NavigationControl | null>(null)
  const rotationFrameRef = useRef<number | null>(null)
  const polygonLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lineLabelsRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const lastInteractionRef = useRef<number>(Date.now())
  const isRotatingRef = useRef<boolean>(false)
  const isUpdatingPositionRef = useRef<boolean>(false)
  const geolocationWatchIdRef = useRef<number | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const initializedRef = useRef<boolean>(false)
  const currentMapCenterRef = useRef<{ center: [number, number]; zoom: number; pitch: number }>({ center: [position?.longitude ?? 0, position?.latitude ?? 0], zoom: 2, pitch: 0 });
  const drawingFeatures = useRef<any>(null)
  const { mapType, setMapType } = useMapToggle()
  const { mapData, setMapData } = useMapData();
  const { setIsMapLoaded } = useMapLoading();
  const previousMapTypeRef = useRef<MapToggleEnum | null>(null)

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  const formatMeasurement = useCallback((value: number, isArea = true) => {
    if (isArea) {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)} km²`
      } else {
        return `${value.toFixed(2)} m²`
      }
    } else {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} km`
      } else {
        return `${value.toFixed(0)} m`
      }
    }
  }, [])

  const updateMeasurementLabels = useCallback(() => {
    if (!map.current || !drawRef.current) return

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
        const area = turf.area(feature)
        const formattedArea = formatMeasurement(area, true)
        
        const isCircle = feature.properties?.user_isCircle;
        const radiusInKm = feature.properties?.user_radiusInKm;

        if (isCircle && radiusInKm) {
          const formattedRadius = formatMeasurement(radiusInKm * 1000, false);
          measurement = `R: ${formattedRadius}, A: ${formattedArea}`;
        } else {
          measurement = formattedArea;
        }

        const centroid = turf.centroid(feature)
        const coordinates = centroid.geometry.coordinates
        
        const el = document.createElement('div')
        el.className = 'area-label'
        el.style.background = 'rgba(255, 255, 255, 0.8)'
        el.style.padding = '4px 8px'
        el.style.borderRadius = '4px'
        el.style.fontSize = '12px'
        el.style.fontWeight = 'bold'
        el.style.color = '#333333'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
        el.style.pointerEvents = 'none'
        el.textContent = measurement
        
        if (map.current) {
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(coordinates as [number, number])
            .addTo(map.current)
          polygonLabelsRef.current[id] = marker
        }
      } 
      else if (feature.geometry.type === 'LineString') {
        featureType = 'LineString';
        const length = turf.length(feature, { units: 'kilometers' }) * 1000
        const formattedLength = formatMeasurement(length, false)
        measurement = formattedLength;
        
        const line = feature.geometry.coordinates
        const midIndex = Math.floor(line.length / 2) - 1
        const midpoint = midIndex >= 0 ? line[midIndex] : line[0]
        
        const el = document.createElement('div')
        el.className = 'distance-label'
        el.style.background = 'rgba(255, 255, 255, 0.8)'
        el.style.padding = '4px 8px'
        el.style.borderRadius = '4px'
        el.style.fontSize = '12px'
        el.style.fontWeight = 'bold'
        el.style.color = '#333333'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
        el.style.pointerEvents = 'none'
        el.textContent = formattedLength
        
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
    isRotatingRef.current = false
    if (rotationFrameRef.current) {
      cancelAnimationFrame(rotationFrameRef.current)
      rotationFrameRef.current = null
    }
  }, [])

  const handleUserInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
    stopRotation()
  }, [stopRotation])

  const updateMapPosition = useCallback(async (lat: number, lng: number) => {
    if (map.current && !isUpdatingPositionRef.current) {
      isUpdatingPositionRef.current = true
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        pitch: 45,
        essential: true
      })
      setTimeout(() => {
        isUpdatingPositionRef.current = false
      }, 2000)
    }
  }, [])

  const setupGeolocationWatcher = useCallback(() => {
    if (geolocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
      geolocationWatchIdRef.current = null
    }

    if (mapType !== MapToggleEnum.RealTimeMode) return

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
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

  const captureMapCenter = useCallback(() => {
    if (map.current) {
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      const pitch = map.current.getPitch();
      const bearing = map.current.getBearing();
      currentMapCenterRef.current = { center: [center.lng, center.lat], zoom, pitch };

      const timezone = tzlookup(center.lat, center.lng);

      setMapData(prevData => ({
        ...prevData,
        currentTimezone: timezone,
        cameraState: {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          pitch,
          bearing
        }
      }));
    }
  }, [setMapData])

  const setupDrawingTools = useCallback(() => {
    if (!map.current) return
    
    if (drawRef.current) {
      try {
        map.current.off('draw.create', updateMeasurementLabels)
        map.current.off('draw.delete', updateMeasurementLabels)
        map.current.off('draw.update', updateMeasurementLabels)
        map.current.removeControl(drawRef.current)
        drawRef.current = null
        Object.values(polygonLabelsRef.current).forEach(marker => marker.remove())
        Object.values(lineLabelsRef.current).forEach(marker => marker.remove())
        polygonLabelsRef.current = {}
        lineLabelsRef.current = {}
      } catch (e) {
        console.log('Error removing draw control:', e)
      }
    }

    if (navControlRef.current) {
      try {
        map.current.removeControl(navControlRef.current)
        navControlRef.current = null
      } catch (e) {
        console.log('Error removing navigation control:', e)
      }
    }
    
    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
        line_string: true
      },
      modes: {
        ...MapboxDraw.modes,
        draw_circle: CircleMode
      },
      defaultMode: 'draw_polygon'
    })
    
    map.current.addControl(drawRef.current, 'top-right')

    const drawControlGroup = document.querySelector('.mapbox-gl-draw_polygon')?.parentElement;
    if (drawControlGroup) {
      const circleBtn = document.createElement('button');
      circleBtn.className = 'mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_circle';
      circleBtn.title = 'Circle Tool';
      circleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        drawRef.current?.changeMode('draw_circle');
      };
      circleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" style="margin: auto;"><circle cx="12" cy="12" r="9" stroke="currentColor" fill="none" stroke-width="2"/></svg>';
      drawControlGroup.appendChild(circleBtn);
    }

    if (window.innerWidth > 768) {
      navControlRef.current = new mapboxgl.NavigationControl()
      map.current.addControl(navControlRef.current, 'top-left')
    }
    
    map.current.on('draw.create', updateMeasurementLabels)
    map.current.on('draw.delete', updateMeasurementLabels)
    map.current.on('draw.update', updateMeasurementLabels)
    
    if (drawingFeatures.current && drawingFeatures.current.features.length > 0) {
      drawingFeatures.current.features.forEach((feature: any) => {
        drawRef.current?.add(feature)
      })
      setTimeout(updateMeasurementLabels, 100)
    }
  }, [updateMeasurementLabels])

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

      map.current.on('moveend', captureMapCenter)
      map.current.on('mousedown', handleUserInteraction)
      map.current.on('touchstart', handleUserInteraction)
      map.current.on('wheel', handleUserInteraction)
      map.current.on('drag', handleUserInteraction)
      map.current.on('zoom', handleUserInteraction)

      map.current.on('load', () => {
        if (!map.current) return
        setMap(map.current)

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

        initializedRef.current = true
        setIsMapReady(true)
        setIsMapLoaded(true)
      })
    }

    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (map.current) {
        map.current.off('moveend', captureMapCenter)
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMap, setIsMapLoaded, captureMapCenter, handleUserInteraction, stopRotation])

  useEffect(() => {
    const prevMapType = previousMapTypeRef.current
    const isMapTypeChanged = prevMapType !== mapType

    if (!map.current || !isMapReady) return

    if (isMapTypeChanged) {
      previousMapTypeRef.current = mapType
      captureMapCenter()
      stopRotation()
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current)
        geolocationWatchIdRef.current = null
      }

      if (mapType === MapToggleEnum.DrawingMode) {
        setupDrawingTools()
      } else if (mapType === MapToggleEnum.RealTimeMode) {
        setupGeolocationWatcher()
      } else {
        startRotation()
      }

      if (prevMapType === MapToggleEnum.DrawingMode && mapType !== MapToggleEnum.DrawingMode) {
        if (drawRef.current) {
          drawingFeatures.current = drawRef.current.getAll()
          try {
            map.current.off('draw.create', updateMeasurementLabels)
            map.current.off('draw.delete', updateMeasurementLabels)
            map.current.off('draw.update', updateMeasurementLabels)
            map.current.removeControl(drawRef.current)
            drawRef.current = null
            Object.values(polygonLabelsRef.current).forEach(marker => marker.remove())
            Object.values(lineLabelsRef.current).forEach(marker => marker.remove())
            polygonLabelsRef.current = {}
            lineLabelsRef.current = {}
          } catch (e) {
            console.log('Error removing draw control:', e)
          }
        }

        if (navControlRef.current) {
          try {
            map.current.removeControl(navControlRef.current)
            navControlRef.current = null
          } catch (e) {
            console.log('Error removing navigation control:', e)
          }
        }
      }
    }
  }, [mapType, isMapReady, updateMeasurementLabels, setupGeolocationWatcher, captureMapCenter, setupDrawingTools, startRotation, stopRotation])

  useEffect(() => {
    if (map.current && position?.latitude && position?.longitude && mapType === MapToggleEnum.RealTimeMode) {
      updateMapPosition(position.latitude, position.longitude)
    }
  }, [position, updateMapPosition, mapType])

  useEffect(() => {
    if (mapData.targetPosition && map.current) {
      const { lat, lng } = mapData.targetPosition;
      if (typeof lat === 'number' && typeof lng === 'number') {
        updateMapPosition(lat, lng);
      }
    }
  }, [mapData.targetPosition, mapData.mapFeature, updateMapPosition]);

  const handleMouseDown = useCallback(() => {
    if (mapType === MapToggleEnum.RealTimeMode) return;
    isMouseDownRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      if (isMouseDownRef.current && map.current && mapType !== MapToggleEnum.DrawingMode) {
        setMapType(MapToggleEnum.DrawingMode);
      }
    }, 3000);
  }, [mapType, setMapType]);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mapData.pendingFeatures && mapData.pendingFeatures.length > 0 && drawRef.current) {
      mapData.pendingFeatures.forEach(feature => {
        drawRef.current?.add(feature);
      });
      setMapData(prev => ({ ...prev, pendingFeatures: [] }));
      setTimeout(updateMeasurementLabels, 100);
    }
  }, [mapData.pendingFeatures, updateMeasurementLabels, setMapData]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="h-full w-full overflow-hidden rounded-l-lg"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}
