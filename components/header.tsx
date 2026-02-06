"use client"
import React from 'react'
import Image from 'next/image'
import { useCalendarToggle } from './calendar-toggle-context'
import { ModeToggle } from './mode-toggle'
import { cn } from '@/lib/utils'
import HistoryContainer from './history-container'
import { Button } from '@/components/ui/button'
import {
  Search,
  CircleUserRound,
  Map,
  CalendarDays,
  TentTree
} from 'lucide-react'
import { MapToggle } from './map-toggle'
import { ProfileToggle } from './profile-toggle'
import { PurchaseCreditsPopup } from './purchase-credits-popup'
import { useUsageToggle } from './usage-toggle-context'
import { useProfileToggle } from './profile-toggle-context'
import { useHistoryToggle } from './history-toggle-context'
import { useState, useEffect } from 'react'

export const Header = () => {
  const { toggleCalendar } = useCalendarToggle()
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
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

  useEffect(() => {
    // Open payment popup as soon as application opens
    setIsPurchaseOpen(true)
  }, [])

  return (
<<<<<<< HEAD
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-10 backdrop-blur md:backdrop-blur-none bg-background/80 md:bg-transparent">
=======
    <>
      <PurchaseCreditsPopup isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} />
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-[60] backdrop-blur bg-background/95 border-b border-border/40">
>>>>>>> origin/main
      <div>
        <a href="/">
          <span className="sr-only">Chat</span>
        </a>
      </div>
      
<<<<<<< HEAD
      <div className="absolute left-1">
        <Button variant="ghost" size="icon">
          <Image src="/images/logo.svg" alt="Logo" width={24} height={24} className="h-6 w-auto" />
=======
      <div className="absolute left-1 flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleHistory} data-testid="logo-history-toggle">
          <Image
            src="/images/logo.svg"
            alt="Logo"
            width={20}
            height={20}
            className="h-5 w-auto"
          />
>>>>>>> origin/main
        </Button>
      </div>
      
      <div className="flex-1 hidden md:flex justify-center gap-10 items-center z-10">
        <ProfileToggle/>
        
        <MapToggle />
        
        <Button variant="ghost" size="icon" onClick={toggleCalendar} title="Open Calendar" data-testid="calendar-toggle">
          <CalendarDays className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        
        <div id="header-search-portal" className="contents" />
        
        <Button variant="ghost" size="icon" onClick={handleUsageToggle}>
          <TentTree className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        
        <ModeToggle />
        
        <HistoryContainer location="header" />
      </div>

      {/* Mobile menu buttons */}
      <div className="flex md:hidden gap-2">
        <div id="mobile-header-search-portal" />
        
        <Button variant="ghost" size="icon" onClick={handleUsageToggle}>
          <TentTree className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        <ProfileToggle/>
      </div>
    </header>
    </>
  )
}

export default Header
