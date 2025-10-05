'use client'

import { useState } from 'react'
import { useMap } from './map/map-context'
import { useActions, useUIState } from 'ai/rsc'
import { nanoid } from 'nanoid'
import { UserMessage } from './user-message'
import { Button } from './ui/button'
import { LucideSearch } from 'lucide-react'
import type { AI } from '@/app/actions'

export function ResolutionSearch() {
  const { map } = useMap()
  const { submit } = useActions()
  const [, setMessages] = useUIState<typeof AI>()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleSearch = async () => {
    if (!map) {
      console.error('Map instance not available.')
      alert('Error: Map is not ready. Please wait a moment and try again.')
      return
    }

    setIsAnalyzing(true)

    try {
      // Add a user-facing message to the chat.
      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          component: <UserMessage content={[{ type: 'text', text: 'Analyze this map view.' }]} />
        }
      ])

      // Get the map canvas and convert it to a Blob.
      const canvas = map.getCanvas()
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/png')
      })

      if (!blob) {
        throw new Error('Failed to capture map image.')
      }

      // Create FormData and append the image and action.
      const formData = new FormData()
      formData.append('file', blob, 'map_capture.png')
      formData.append('action', 'resolution_search')

      // Submit the form data to the server action.
      const responseMessage = await submit(formData)
      setMessages(currentMessages => [...currentMessages, responseMessage as any])
    } catch (error) {
      console.error('Failed to perform resolution search:', error)
      alert('An error occurred while analyzing the map. Please check the console for details.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="absolute top-4 right-14 z-20 bg-background/80 backdrop-blur-sm hover:bg-background"
      onClick={handleSearch}
      disabled={isAnalyzing || !map}
      title="Analyze current map view"
    >
      {isAnalyzing ? (
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current"></div>
      ) : (
        <LucideSearch className="h-5 w-5" />
      )}
    </Button>
  )
}