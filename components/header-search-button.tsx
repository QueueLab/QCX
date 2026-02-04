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
      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          component: <UserMessage content={[{ type: 'text', text: 'Analyze this map view.' }]} />
        }
      ])

      let mapboxBlob: Blob | null = null;
      let googleBlob: Blob | null = null;

      const { center, range, zoom: cameraZoom } = mapData.cameraState || {};
      const zoom = cameraZoom ?? (range ? Math.round(Math.log2(40000000 / range)) : 2);

      // Capture Mapbox Preview
      if (map) {
        const canvas = map.getCanvas();
        mapboxBlob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, 'image/png');
        });
      }

      // Capture Google Preview
      if (center) {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          let staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${Math.round(zoom)}&size=640x480&scale=2&maptype=satellite&key=${apiKey}`;
          try {
            const response = await fetch(staticMapUrl);
            if (response.ok) {
              googleBlob = await response.blob();
            }
          } catch (e) {
            console.error('Failed to fetch google static map:', e);
          }
        }
      }

      if (!mapboxBlob && !googleBlob) {
        throw new Error('Failed to capture any map images.')
      }

      const formData = new FormData()
      if (mapboxBlob) formData.append('mapboxFile', mapboxBlob, 'mapbox_capture.png')
      if (googleBlob) formData.append('googleFile', googleBlob, 'google_capture.png')

      // Keep 'file' for backward compatibility in case it's used elsewhere
      formData.append('file', (mapboxBlob || googleBlob)!, 'map_capture.png')

      formData.append('action', 'resolution_search')
      formData.append('timezone', mapData.currentTimezone || 'UTC')
      formData.append('drawnFeatures', JSON.stringify(mapData.drawnFeatures || []))
      formData.append('mapProvider', mapProvider)

      const responseMessage = await actions.submit(formData)
      setMessages(currentMessages => [...currentMessages, responseMessage as any])
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