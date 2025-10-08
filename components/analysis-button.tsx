'use client'

import React, { useState } from 'react'
import { useActions, useUIState } from 'ai/rsc'
import { AI } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useMap } from './map/map-context'
import { nanoid } from 'nanoid'
import { UserMessage } from './user-message'
import { toast } from 'sonner'

export function AnalysisButton() {
  const { map } = useMap()
  const { submit } = useActions()
  const [, setMessages] = useUIState<typeof AI>()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyzeViewport = async () => {
    if (!map) {
      toast.error('Map is not available yet. Please wait for it to load.')
      return
    }

    setIsAnalyzing(true)

    try {
      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          component: <UserMessage content={[{ type: 'text', text: 'Analyze current map view' }]} />
        }
      ])

      const center = map.getCenter()
      const zoom = map.getZoom()
      const bounds = map.getBounds()

      if (!bounds) {
        toast.error('Could not determine map boundaries. Please try again.')
        setIsAnalyzing(false)
        return
      }

      const formData = new FormData()
      formData.append('action', 'viewport_analysis')
      formData.append(
        'viewport',
        JSON.stringify({
          center: { lng: center.lng, lat: center.lat },
          zoom,
          bounds: {
            sw: { lng: bounds.getWest(), lat: bounds.getSouth() },
            ne: { lng: bounds.getEast(), lat: bounds.getNorth() }
          }
        })
      )

      const responseMessage = await submit(formData)
      setMessages(currentMessages => [...currentMessages, responseMessage as any])
    } catch (error) {
      console.error('Failed to perform viewport analysis:', error)
      toast.error('An error occurred while analyzing the map.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleAnalyzeViewport}
      disabled={isAnalyzing || !map}
      title="Analyze current map view"
    >
      {isAnalyzing ? (
        <div className="h-[1.2rem] w-[1.2rem] animate-spin rounded-full border-b-2 border-current"></div>
      ) : (
        <Search className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  )
}