'use client'

import { APIProvider } from '@vis.gl/react-google-maps'
import { useEffect } from 'react'
import { useToast } from '@/components/ui/hooks/use-toast'
import { useMapData } from './map-data-context'
import { useSettingsStore } from '@/lib/store/settings'
import { Map3D } from './map-3d'

export function GoogleMapComponent() {
  const { toast } = useToast()
  const { mapData } = useMapData()
  const { setMapProvider } = useSettingsStore()

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey) {
      toast({
        title: 'Google Maps API Key Missing',
        description: 'The Google Maps API key is not configured. Falling back to Mapbox.',
        variant: 'destructive',
      })
      setMapProvider('mapbox')
    }
  }, [apiKey, setMapProvider, toast])

  if (!apiKey) {
    return null
  }

  const cameraOptions = mapData.targetPosition
    ? { center: mapData.targetPosition, range: 1000, tilt: 60, heading: 0 }
    : { center: { lat: 37.7749, lng: -122.4194 }, range: 1000, tilt: 60, heading: 0 };

  return (
    <APIProvider apiKey={apiKey} version="alpha">
      <Map3D
        style={{ width: '100%', height: '100%' }}
        cameraOptions={cameraOptions}
        mode="SATELLITE"
      />
    </APIProvider>
  )
}
