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
  TentTree,
  ChevronRight
} from 'lucide-react'
import { MapToggle } from './map-toggle'
import { ProfileToggle } from './profile-toggle'
import { PurchaseCreditsPopup } from './credits/purchase-credits-popup'
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
    if (!isUsageOpen && activeView) {
      closeProfileView()
    }
    toggleUsage()
  }

  useEffect(() => {
    setIsPurchaseOpen(true)
  }, [])

  return (
    <>
      <PurchaseCreditsPopup />
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-[60] backdrop-blur bg-background/95 border-b border-border/40">
      <div className="flex-1 hidden md:flex justify-start gap-10 items-center z-10 pl-4">
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

      <div className="absolute right-2 flex items-center gap-2">
        <h1 className="text-2xl font-poppins font-semibold text-primary hidden sm:block">
          QCX
        </h1>
        <Button variant="ghost" size="icon" onClick={toggleHistory} data-testid="logo-history-toggle" className="flex items-center gap-1 group">
          <div className="relative">
            <Image
              src="/images/logo.svg"
              alt="Logo"
              width={24}
              height={24}
              className="h-6 w-auto transition-transform group-hover:scale-110"
            />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Mobile menu buttons (left side for mobile since logo is right) */}
      <div className="flex md:hidden gap-2">
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
