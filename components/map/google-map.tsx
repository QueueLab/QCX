'use client'

import { APIProvider } from '@vis.gl/react-google-maps'
import { useEffect, useMemo } from 'react'
import { useToast } from '@/components/ui/hooks/use-toast'
import { useMapData } from './map-data-context'
import { useSettingsStore } from '@/lib/store/settings'
import { useMapLoading } from '../map-loading-context';
import { Map3D } from './map-3d'
import { GoogleGeoJsonLayer } from './google-geojson-layer'

export function GoogleMapComponent() {
  const { toast } = useToast()
  const { mapData } = useMapData()
  const { setMapProvider } = useSettingsStore()
  const { setIsMapLoaded } = useMapLoading();

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

  useEffect(() => {
    setIsMapLoaded(true);
    return () => {
      setIsMapLoaded(false);
    };
  }, [setIsMapLoaded]);

  const featureCollection = useMemo(() => {
    const features = mapData.drawnFeatures?.map(df => ({
      type: 'Feature' as const,
      geometry: df.geometry,
      properties: {
        id: df.id,
        measurement: df.measurement
      }
    })) || [];

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [mapData.drawnFeatures]);

  const cameraOptions = useMemo(() => {
    if (mapData.cameraState) {
      const { center, zoom, pitch, bearing } = mapData.cameraState;
      // Convert Mapbox zoom to Google Maps range (approximate)
      const range = zoom ? 40000000 / Math.pow(2, zoom) : 20000000;
      return {
        center,
        range,
        tilt: pitch || 0,
        heading: bearing || 0,
      };
    }
    if (mapData.targetPosition) {
      return { center: mapData.targetPosition, range: 1000, tilt: 60, heading: 0 };
    }
    return { center: { lat: 37.7749, lng: -122.4194 }, range: 1000, tilt: 60, heading: 0 };
  }, [mapData.cameraState, mapData.targetPosition]);

  if (!apiKey) {
    return null
  }

  return (
    <APIProvider apiKey={apiKey} version="alpha">
      <Map3D
        style={{ width: '100%', height: '100%' }}
        cameraOptions={cameraOptions}
        mode="SATELLITE"
      />
      <GoogleGeoJsonLayer data={featureCollection} />
      {mapData.uploadedGeoJson?.map(item => (
        item.visible && <GoogleGeoJsonLayer key={item.id} data={item.data} />
      ))}
    </APIProvider>
  )
}
