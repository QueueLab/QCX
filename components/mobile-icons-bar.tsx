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
import { History } from '@/components/history'
import { MapToggle } from './map-toggle'
import { ModeToggle } from './mode-toggle'
import { useAnalysisTool } from './analysis-tool-context'
import { useMap } from './map/map-context'

interface MobileIconsBarProps {
  onAttachmentClick: () => void;
}

export const MobileIconsBar: React.FC<MobileIconsBarProps> = ({ onAttachmentClick }) => {
  const [, setMessages] = useUIState<typeof AI>()
  const { clearChat } = useActions()
  const { isAnalyzing, handleResolutionSearch } = useAnalysisTool()
  const { map } = useMap()

  const handleNewChat = async () => {
    setMessages([])
    await clearChat()
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
      <Button variant="ghost" size="icon">
        <CalendarDays className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleResolutionSearch}
        disabled={isAnalyzing || !map}
        title="Analyze current map view"
      >
        {isAnalyzing ? (
          <div className="h-[1.2rem] w-[1.2rem] animate-spin rounded-full border-b-2 border-current"></div>
        ) : (
          <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        )}
      </Button>
      <Button variant="ghost" size="icon">
        <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
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
