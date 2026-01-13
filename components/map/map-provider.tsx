'use client'

import { useSettingsStore } from '@/lib/store/settings'
import dynamic from 'next/dynamic'

const Mapbox = dynamic(
  () => import('./mapbox-map').then(mod => mod.Mapbox),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" /> }
)

const GoogleMapComponent = dynamic(
  () => import('./google-map').then(mod => mod.GoogleMapComponent),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" /> }
)

const OSMMap = dynamic(
  () => import('./osm-map').then(mod => mod.OSMMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" /> }
)

export function MapProvider({ position }: { position?: { latitude: number; longitude: number; } }) {
  const { mapProvider } = useSettingsStore()

  return (
    <>
      {mapProvider === 'google' ? (
        <GoogleMapComponent />
      ) : mapProvider === 'osm' ? (
        <OSMMap />
      ) : (
        <Mapbox position={position} />
      )}
    </>
  )
}
