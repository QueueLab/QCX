'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Search,
  CalendarDays,
  TentTree,
  Paperclip,
  ArrowRight,
  Plus
} from 'lucide-react'
import { History } from '@/components/history'
import { MapToggle } from './map-toggle'
import { ModeToggle } from './mode-toggle'
import { ProfileToggle } from './profile-toggle'
import { useCalendarToggle } from './calendar-toggle-context'

interface MobileIconsBarProps {
  onAttachmentClick: () => void;
  onSubmitClick: () => void;
}

export const MobileIconsBar: React.FC<MobileIconsBarProps> = ({ onAttachmentClick, onSubmitClick }) => {
  const { toggleCalendar } = useCalendarToggle()

  const handleNewChat = async () => {
     window.location.href = '/'
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
      <Button variant="ghost" size="icon" data-testid="mobile-search-button">
        <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <a href="https://buy.stripe.com/3cIaEX3tRcur9EM7tbasg00" target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="icon">
          <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        </Button>
      </a>
      <Button variant="ghost" size="icon" onClick={onAttachmentClick} data-testid="mobile-attachment-button">
        <Paperclip className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" data-testid="mobile-submit-button" onClick={onSubmitClick}>
        <ArrowRight className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <History location="header" />
      <ModeToggle />
    </div>
  )
}

export default MobileIconsBar
