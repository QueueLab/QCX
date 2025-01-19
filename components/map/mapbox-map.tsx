'use client'

import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useMapToggle, MapToggleEnum } from '../map-toggle-context'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const Mapbox: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [is3D, setIs3D] = useState(false)
  const [position, setPosition] = useState({
    latitude: -74.0060152,
    longitude: 40.7127281
  })
  const {mapType} = useMapToggle();

  useEffect(() => {
    if(mapType !== MapToggleEnum.RealTimeMode)
        return;

    let watchId: number | null = null
    // real time location
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser')
    } else {
      const success = (geoPos: GeolocationPosition) => {
        setPosition({
          latitude: geoPos.coords.latitude,
          longitude: geoPos.coords.longitude
        })
        mapType === MapToggleEnum.RealTimeMode &&map.current &&
          map.current.flyTo({
            center: [geoPos.coords.longitude, geoPos.coords.latitude],
            zoom: 22
          })
      }

      const error = (error: GeolocationPositionError) => {}

      watchId = navigator.geolocation.watchPosition(success, error)

      return () => {
        watchId && navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [mapType]);

  useEffect(() => {
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-v9', // Satellite style
        center: [-74.0060152, 40.7127281], // Coordinates for Mount Everest
        zoom: 12, // Closer zoom for better 3D effect
        pitch: 60, // Tilts the map for a 3D effect
        bearing: -20, // Rotates the map for a better view
        maxZoom: 22,
        attributionControl: false
      })
      // Add zoom controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

      // Add terrain
      map.current.on('load', () => {
        map.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 22
        })

        // Add the DEM source as a terrain layer with exaggerated height
        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })

        // Add sky layer for background
        map.current.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }
        })
      })

      // Clean up on unmount
      return () => {
        map.current?.remove()
      }
    }
  }, [])

  return (
    <div
      ref={mapContainer}
      className="h-full w-full overflow-hidden rounded-l-lg"
    />
  )
}
