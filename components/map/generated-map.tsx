'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string

export const GeneratedMap: React.FC<{
  position: { latitude: number; longitude: number }
}> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (map.current) return // initialize map only once
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [position.longitude, position.latitude],
        zoom: 12
      })

      // Add a marker to the map
      new mapboxgl.Marker()
        .setLngLat([position.longitude, position.latitude])
        .addTo(map.current)
    }
  }, [position])

  return <div ref={mapContainer} className="h-full w-full" />
}
