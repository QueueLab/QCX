'use client'

import React from 'react'
import { useUIState, useActions } from 'ai/rsc'
import { AI } from '@/app/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import { ProfileToggle } from './profile-toggle'
import { useCalendarToggle } from './calendar-toggle-context'
import { Spinner } from './ui/spinner'

interface MobileIconsBarProps {
  onAttachmentClick: () => void;
  onSubmitClick: () => void;
  isPending?: boolean;
}

export const MobileIconsBar: React.FC<MobileIconsBarProps> = ({ onAttachmentClick, onSubmitClick, isPending }) => {
  const [, setMessages] = useUIState<typeof AI>()
  const { clearChat } = useActions()
  const { toggleCalendar } = useCalendarToggle()

  const handleNewChat = async () => {
    setMessages([])
    await clearChat()
  }

  return (
    <div className="mobile-icons-bar-content">
      <Button variant="ghost" size="icon" onClick={handleNewChat} data-testid="mobile-new-chat-button" aria-label="Start new chat">
        <Plus className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <ProfileToggle />
      <MapToggle />
      <Button variant="ghost" size="icon" onClick={toggleCalendar} title="Open Calendar" aria-label="Open Calendar" data-testid="mobile-calendar-button">
        <CalendarDays className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" data-testid="mobile-search-button" aria-label="Search">
        <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <a
        href="https://buy.stripe.com/14A3cv7K72TR3go14Nasg02"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Purchase credits"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
      >
        <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </a>
      <Button variant="ghost" size="icon" onClick={onAttachmentClick} data-testid="mobile-attachment-button" aria-label="Attach file">
        <Paperclip className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon" data-testid="mobile-submit-button" onClick={onSubmitClick} aria-label="Send message" disabled={isPending}>
        {isPending ? <Spinner /> : <ArrowRight className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />}
      </Button>
      <History location="header" />
      <ModeToggle />
    </div>
  )
}

export default MobileIconsBar
