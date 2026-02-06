'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useMap } from './map/map-context'
import { useActions, useUIState } from 'ai/rsc'
import { AI } from '@/app/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './user-message'
import { toast } from 'sonner'
import { useSettingsStore } from '@/lib/store/settings'
import { useMapData } from './map/map-data-context'
import { compressImage } from '@/lib/utils/image-utils'

// Define an interface for the actions to help TypeScript during build
interface HeaderActions {
  submit: (formData: FormData) => Promise<any>;
}

export function HeaderSearchButton() {
  const { map } = useMap()
  const { mapProvider } = useSettingsStore()
  const { mapData } = useMapData()
  // Cast the actions to our defined interface to avoid build errors
  const actions = useActions<typeof AI>() as unknown as HeaderActions
  const [, setMessages] = useUIState<typeof AI>()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [desktopPortal, setDesktopPortal] = useState<HTMLElement | null>(null)
  const [mobilePortal, setMobilePortal] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Portals can only be used on the client-side after the DOM has mounted
    setDesktopPortal(document.getElementById('header-search-portal'))
    setMobilePortal(document.getElementById('mobile-header-search-portal'))
  }, [])

  const handleResolutionSearch = async () => {
    if (mapProvider === 'mapbox' && !map) {
      toast.error('Map is not available yet. Please wait for it to load.')
      return
    }
    if (!actions) {
      toast.error('Search actions are not available.')
      return
    }

    setIsAnalyzing(true)

    try {
      setMessages((currentMessages: any[]) => [
        ...currentMessages,
        {
          id: nanoid(),
          component: <UserMessage content={[{ type: 'text', text: 'Analyze this map view.' }]} />
        }
      ])

      let mapboxBlob: Blob | null = null;
      let googleBlob: Blob | null = null;

      if (mapProvider === 'mapbox' && map) {
        // Capture Mapbox
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

        // Also fetch Google Static Map for the same view
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

      const formData = new FormData()
      if (mapboxBlob) formData.append('file_mapbox', mapboxBlob, 'mapbox_capture.png')
      if (googleBlob) formData.append('file_google', googleBlob, 'google_capture.png')

      // Keep 'file' for backward compatibility if needed, or just use the first available
      formData.append('file', (mapboxBlob || googleBlob)!, 'map_capture.png')

      formData.append('action', 'resolution_search')
      formData.append('timezone', mapData.currentTimezone || 'UTC')
      formData.append('drawnFeatures', JSON.stringify(mapData.drawnFeatures || []))

      const center = mapProvider === 'mapbox' && map ? map.getCenter() : mapData.cameraState?.center;
      if (center) {
        formData.append('latitude', center.lat.toString())
        formData.append('longitude', center.lng.toString())
      }

      const responseMessage = await actions.submit(formData)
      setMessages((currentMessages: any[]) => [...currentMessages, responseMessage as any])
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
      disabled={isAnalyzing || !map || !actions}
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
    <Button variant="ghost" size="sm" onClick={handleResolutionSearch} disabled={isAnalyzing || !map || !actions}>
      <Search className="h-4 w-4 mr-2" />
      Search
    </Button>
  )

  return (
    <>
      {desktopPortal && createPortal(desktopButton, desktopPortal)}
      {mobilePortal && createPortal(mobileButton, mobilePortal)}
    </>
  )
}
