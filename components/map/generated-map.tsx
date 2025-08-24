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

export const GeneratedMap: React.FC<{
  position: { latitude: number; longitude: number; zoom?: number }
}> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  // Initialize map and marker once, and clean up on unmount
  useEffect(() => {
    if (!mapContainer.current || map.current) return
    if (!mapboxgl.accessToken) {
      console.warn('GeneratedMap: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set.')
      return
    }
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [position.longitude, position.latitude],
      zoom: position.zoom ?? 12
    })
    markerRef.current = new mapboxgl.Marker()
      .setLngLat([position.longitude, position.latitude])
      .addTo(map.current)

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map center/zoom and marker when position changes
  useEffect(() => {
    if (!map.current) return
    const lngLat: [number, number] = [position.longitude, position.latitude]
    map.current.flyTo({
      center: lngLat,
      zoom: position.zoom ?? map.current.getZoom(),
      essential: true
    })
    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat)
    } else {
      markerRef.current = new mapboxgl.Marker()
        .setLngLat(lngLat)
        .addTo(map.current)
    }
  }, [position])
  return <div ref={mapContainer} className="h-full w-full" />
}
