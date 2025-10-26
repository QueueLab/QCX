'use client'

import React, { useState } from 'react'
import { useUIState, useActions } from 'ai/rsc'
import { AI } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  Search,
  CircleUserRound,
  Map,
  CalendarDays,
  TentTree,
  Paperclip,
  ArrowRight,
  Plus
} from 'lucide-react'
import { History } from '@/components/history'
import { MapToggle } from './map-toggle'
import { ModeToggle } from './mode-toggle'
import { useCalendarToggle } from './calendar-toggle-context'
import { useMap } from './map/map-context'
import { nanoid } from 'nanoid'
import { UserMessage } from './user-message'
import { toast } from 'react-toastify'

// Define an interface for the actions to help TypeScript during build
interface HeaderActions {
  submit: (formData: FormData) => Promise<any>;
  clearChat: () => void;
}

interface MobileIconsBarProps {
  onAttachmentClick: () => void;
}

export const MobileIconsBar: React.FC<MobileIconsBarProps> = ({ onAttachmentClick }) => {
  const [, setMessages] = useUIState<typeof AI>()
  const actions = useActions<typeof AI>() as unknown as HeaderActions
  const { toggleCalendar } = useCalendarToggle()
  const { map } = useMap()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleNewChat = async () => {
    setMessages([])
    await actions.clearChat()
  }

  const handleResolutionSearch = async () => {
    if (!map) {
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

  return (
    <div className="mobile-icons-bar-content">
      <Button variant="ghost" size="icon" onClick={handleNewChat}>
        <Plus className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button variant="ghost" size="icon">
        <CircleUserRound className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <MapToggle />
      <Button variant="ghost" size="icon" onClick={toggleCalendar} title="Open Calendar">
        <CalendarDays className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleResolutionSearch} disabled={isAnalyzing || !map || !actions}>
        {isAnalyzing ? (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current"></div>
        ) : (
          <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        )}
      </Button>
      <a href="https://buy.stripe.com/3cIaEX3tRcur9EM7tbasg00" target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="icon">
          <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        </Button>
      </a>
      <Button variant="ghost" size="icon" onClick={onAttachmentClick}>
        <Paperclip className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon">
        <ArrowRight className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <History location="header" />
      <ModeToggle />
    </div>
  )
}

export default MobileIconsBar
