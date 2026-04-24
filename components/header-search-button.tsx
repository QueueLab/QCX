'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useMap } from './map/map-context'
import { useChatContext } from './chat-provider'
import { nanoid } from '@/lib/utils'
import { toast } from 'sonner'
import { useSettingsStore } from '@/lib/store/settings'
import { useMapData } from './map/map-data-context'
import { compressImage } from '@/lib/utils/image-utils'

export function HeaderSearchButton() {
  const { map } = useMap()
  const { mapProvider } = useSettingsStore()
  const { mapData } = useMapData()
  const { append } = useChatContext()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [desktopPortal, setDesktopPortal] = useState<HTMLElement | null>(null)
  const [mobilePortal, setMobilePortal] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setDesktopPortal(document.getElementById('header-search-portal'))

    const checkMobilePortal = () => {
      const el = document.getElementById('mobile-header-search-portal')
      if (el) {
        setMobilePortal(el)
        return true
      }
      return false
    }

    if (!checkMobilePortal()) {
      const interval = setInterval(() => {
        if (checkMobilePortal()) {
          clearInterval(interval)
        }
      }, 500)

      return () => clearInterval(interval)
    }
  }, [])

  const handleResolutionSearch = async () => {
    if (mapProvider === 'mapbox' && !map) {
      toast.error('Map is not available yet. Please wait for it to load.')
      return
    }

    setIsAnalyzing(true)

    try {
      let mapboxBlob: Blob | null = null;
      let googleBlob: Blob | null = null;

      if (mapProvider === 'mapbox' && map) {
        const canvas = map.getCanvas()
        const rawMapboxBlob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, 'image/png')
        })
        if (rawMapboxBlob) {
          mapboxBlob = await compressImage(rawMapboxBlob).catch(e => {
            console.error('Failed to compress Mapbox image:', e);
            return rawMapboxBlob;
          });
        }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const center = map.getCenter();
          const zoom = Math.round(map.getZoom());
          const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=640x480&scale=2&maptype=satellite&key=${apiKey}`;

          try {
            const response = await fetch(staticMapUrl);
            if (response.ok) {
              const rawGoogleBlob = await response.blob();
              googleBlob = await compressImage(rawGoogleBlob).catch(e => {
                console.error('Failed to compress Google image:', e);
                return rawGoogleBlob;
              });
            }
          } catch (e) {
            console.error('Failed to fetch Google static map during Mapbox session:', e);
          }
        }
      } else if (mapProvider === 'google') {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey || !mapData.cameraState) {
          toast.error('Google Maps API key or camera state is not available.')
          setIsAnalyzing(false)
          return
        }
        const { center, range } = mapData.cameraState
        const zoom = Math.round(Math.log2(40000000 / (range || 1)));

        let staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=640x480&scale=2&maptype=satellite&key=${apiKey}`;

        const response = await fetch(staticMapUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch static map image.');
        }
        const rawGoogleBlob = await response.blob();
        googleBlob = await compressImage(rawGoogleBlob).catch(e => {
          console.error('Failed to compress Google image:', e);
          return rawGoogleBlob;
        });
      }

      if (!mapboxBlob && !googleBlob) {
        throw new Error('Failed to capture map image.')
      }

      // Convert blobs to base64 for the API
      const blobToBase64 = async (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }

      const fileData = await blobToBase64((mapboxBlob || googleBlob)!)
      const mapboxImageData = mapboxBlob ? await blobToBase64(mapboxBlob) : undefined
      const googleImageData = googleBlob ? await blobToBase64(googleBlob) : undefined

      const center = mapProvider === 'mapbox' && map ? map.getCenter() : mapData.cameraState?.center;

      await append(
        { role: 'user', content: 'Analyze this map view.' },
        {
          body: {
            action: 'resolution_search',
            fileData,
            mapboxImageData,
            googleImageData,
            timezone: mapData.currentTimezone || 'UTC',
            drawnFeatures: mapData.drawnFeatures || [],
            latitude: center?.lat?.toString(),
            longitude: center?.lng?.toString(),
          }
        }
      )
    } catch (error) {
      console.error('Failed to perform resolution search:', error)
      toast.error('An error occurred while analyzing the map.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const desktopButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleResolutionSearch}
      disabled={isAnalyzing || !map}
      title="Analyze current map view"
    >
      {isAnalyzing ? (
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current"></div>
      ) : (
        <Search className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  )

  const mobileButton = (
    <Button variant="ghost" size="icon" onClick={handleResolutionSearch} disabled={isAnalyzing || !map} data-testid="mobile-search-button">
      {isAnalyzing ? (
        <div className="h-[1.2rem] w-[1.2rem] animate-spin rounded-full border-b-2 border-current"></div>
      ) : (
        <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      )}
    </Button>
  )

  return (
    <>
      {desktopPortal && createPortal(desktopButton, desktopPortal)}
      {mobilePortal && createPortal(mobileButton, mobilePortal)}
    </>
  )
}
