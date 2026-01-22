'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useMap } from './map/map-context'
import { toast } from 'react-toastify'
import { useSettingsStore } from '@/lib/store/settings'
import { useMapData } from './map/map-data-context'

export function HeaderSearchButton() {
  const { map } = useMap()
  const { mapProvider } = useSettingsStore()
  const { mapData } = useMapData()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [desktopPortal, setDesktopPortal] = useState<HTMLElement | null>(null)
  const [mobilePortal, setMobilePortal] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setDesktopPortal(document.getElementById('header-search-portal'))
    setMobilePortal(document.getElementById('mobile-header-search-portal'))
  }, [])

  const handleResolutionSearch = async () => {
    if (mapProvider === 'mapbox' && !map) {
      toast.error('Map is not available yet. Please wait for it to load.')
      return
    }

    setIsAnalyzing(true)

    try {
      let blob: Blob | null = null;
      if (mapProvider === 'mapbox') {
        const canvas = map!.getCanvas()
        blob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, 'image/png')
        })
      } else if (mapProvider === 'google') {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey || !mapData.cameraState) {
          toast.error('Google Maps API key or camera state is not available.')
          setIsAnalyzing(false)
          return
        }
        const { center, range } = mapData.cameraState
        const zoom = Math.round(Math.log2(40000000 / (range || 1)));
        let staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=640x480&maptype=satellite&key=${apiKey}`;
        const response = await fetch(staticMapUrl);
        if (!response.ok) throw new Error('Failed to fetch static map image.');
        blob = await response.blob();
      }

      if (!blob) throw new Error('Failed to capture map image.')
      const file = new File([blob], 'map_capture.png', { type: 'image/png' });
      const event = new CustomEvent('resolution-search', { detail: { file } });
      window.dispatchEvent(event);

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
      disabled={isAnalyzing}
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
    <Button variant="ghost" size="sm" onClick={handleResolutionSearch} disabled={isAnalyzing}>
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
