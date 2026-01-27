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
import { toast } from 'react-toastify'

// Define an interface for the actions to help TypeScript during build
interface HeaderActions {
  submit: (formData: FormData) => Promise<any>;
}

export function HeaderSearchButton() {
  const { map } = useMap()
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
    if (!map) {
      toast.error('Map is not available yet. Please wait for it to load.')
      return
    }
    if (!actions) {
      // This should theoretically not happen if the component is used correctly
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

      const canvas = map.getCanvas()
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png')
      })

      if (!blob) {
        throw new Error('Failed to capture map image.')
      }

      const formData = new FormData()
      formData.append('file', blob, 'map_capture.png')
      formData.append('action', 'resolution_search')

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