'use client'

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { useEffect } from 'react'
import { useToast } from '@/components/ui/hooks/use-toast'
import { useMapData } from './map-data-context'
import { useSettingsStore } from '@/lib/store/settings'

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

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
        defaultZoom={12}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        mapId="b1d7b3c4f8c8a4de"
      >
        {mapData.markers && mapData.markers.map((marker, index) => (
          <AdvancedMarker
            key={index}
            position={{ lat: marker.latitude, lng: marker.longitude }}
            title={marker.title}
          />
        ))}
      </Map>
    </APIProvider>
  )
}
