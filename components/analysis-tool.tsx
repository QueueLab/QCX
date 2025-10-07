'use client'

import React, { useState } from 'react'
import { useActions, useUIState } from 'ai/rsc'
import { AI } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useMap } from './map/map-context'
import { nanoid } from 'nanoid'
import { UserMessage } from './user-message'
import { toast } from 'react-toastify'

export function AnalysisTool() {
  const { map } = useMap()
  const { submit } = useActions()
  const [, setMessages] = useUIState<typeof AI>()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleResolutionSearch = async () => {
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

      const responseMessage = await submit(formData)
      setMessages(currentMessages => [...currentMessages, responseMessage as any])
    } catch (error) {
      console.error('Failed to perform resolution search:', error)
      toast.error('An error occurred while analyzing the map.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="absolute top-4 right-4 z-20">
      <Button
        variant="outline"
        size="icon"
        onClick={handleResolutionSearch}
        disabled={isAnalyzing || !map}
        title="Analyze current map view"
        className="bg-background/80 backdrop-blur-sm hover:bg-background"
      >
        {isAnalyzing ? (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current"></div>
        ) : (
          <Search className="h-5 w-5" />
        )}
      </Button>
    </div>
  )
}