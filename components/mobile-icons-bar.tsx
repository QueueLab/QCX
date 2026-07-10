'use client'

import React from 'react'
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
import { MapToggle } from './map-toggle'
import { ProfileToggle } from './profile-toggle'
import { useCalendarToggle } from './calendar-toggle-context'
import { useUsageToggle } from './usage-toggle-context'
import { useProfileToggle } from './profile-toggle-context'
import { useHistoryToggle } from './history-toggle-context'

interface MobileIconsBarProps {
  onAttachmentClick: () => void;
  onSubmitClick: () => void;
}

export const MobileIconsBar: React.FC<MobileIconsBarProps> = ({ onAttachmentClick, onSubmitClick }) => {
  const [, setMessages] = useUIState<typeof AI>()
  const { clearChat } = useActions()
  const { toggleCalendar } = useCalendarToggle()
  const { toggleUsage, isUsageOpen } = useUsageToggle()
  const { activeView, closeProfileView } = useProfileToggle()
  const { toggleHistory } = useHistoryToggle()

  const handleUsageToggle = () => {
    // If we're about to open usage and profile is open, close profile first
    if (!isUsageOpen && activeView) {
      closeProfileView()
    }
    toggleUsage()
  }

  const handleNewChat = async () => {
    setMessages([])
    await clearChat()
  }

  return (
    <div className="mobile-icons-bar-content">
      <Button variant="ghost" size="icon" onClick={handleNewChat} data-testid="mobile-new-chat-button">
        <Plus className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <ProfileToggle />
      <MapToggle />
      <Button variant="ghost" size="icon" onClick={toggleCalendar} title="Open Calendar" data-testid="mobile-calendar-button">
        <CalendarDays className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <div id="mobile-header-search-portal" className="contents" />
      <Button variant="ghost" size="icon" onClick={handleUsageToggle}>
        <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onAttachmentClick} data-testid="mobile-attachment-button">
        <Paperclip className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" data-testid="mobile-submit-button" onClick={onSubmitClick}>
        <ArrowRight className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" onClick={toggleHistory} data-testid="mobile-history-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M12 7v5l4 2"/>
        </svg>
      </Button>
    </div>
  )
}

export default MobileIconsBar
