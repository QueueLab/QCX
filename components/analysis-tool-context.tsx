'use client'

'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useActions, useUIState } from 'ai/rsc'
import { AI } from '@/app/actions'
import { useMap } from './map/map-context'
import { nanoid } from 'nanoid'
import { UserMessage } from './user-message'
import { toast } from 'react-toastify'

type AnalysisToolContextType = {
  isAnalyzing: boolean
  handleResolutionSearch: () => void
}

const AnalysisToolContext = createContext<AnalysisToolContextType | undefined>(
  undefined
)

export const AnalysisToolProvider = ({ children }: { children: ReactNode }) => {
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
    <AnalysisToolContext.Provider
      value={{ isAnalyzing, handleResolutionSearch }}
    >
      {children}
    </AnalysisToolContext.Provider>
  )
}

export const useAnalysisTool = (): AnalysisToolContextType => {
  const context = useContext(AnalysisToolContext)
  if (!context) {
    throw new Error('useAnalysisTool must be used within an AnalysisToolProvider')
  }
  return context
}