"use client"
import React from 'react'
import Image from 'next/image'
import { useCalendarToggle } from './calendar-toggle-context'
import { History } from './history'
import { cn } from '@/lib/utils'
import HistoryContainer from './history-container'
import { Button } from '@/components/ui/button'
import {
  CalendarDays,
  TentTree
} from 'lucide-react'
import { MapToggle } from './map-toggle'
import { ProfileToggle } from './profile-toggle'
import { PurchaseCreditsPopup } from './purchase-credits-popup'
import { useUsageToggle } from './usage-toggle-context'
import { useHistoryToggle } from './history-toggle-context'
import { useState, useEffect } from 'react'

export const Header = () => {
  const { toggleCalendar } = useCalendarToggle()
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const { toggleUsage } = useUsageToggle()
  const { toggleHistory } = useHistoryToggle()

  const handleUsageToggle = () => {
    toggleUsage()
  }

  useEffect(() => {
    // Open payment popup as soon as application opens
    setIsPurchaseOpen(true)
  }, [])

  return (
    <>
      <PurchaseCreditsPopup isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} />
    <header className="fixed w-full p-1 md:p-2 hidden md:flex justify-between items-center z-[60] backdrop-blur bg-background/95 border-b border-border/40">
      <div>
        <a href="/">
          <span className="sr-only">Chat</span>
        </a>
      </div>

      <div className="absolute left-1 flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleHistory} data-testid="logo-history-toggle">
          <Image
            src="/images/logo.svg"
            alt="Logo"
            width={20}
            height={20}
            className="h-5 w-auto"
          />
        </Button>
        <h1
          className="text-2xl font-poppins font-semibold text-primary cursor-pointer select-none"
          onClick={toggleHistory}
        >
          QCX
        </h1>
      </div>

      <div className="flex-1 hidden md:flex justify-center gap-10 items-center z-10">
        <ProfileToggle />

        <MapToggle />

        <Button variant="ghost" size="icon" onClick={toggleCalendar} title="Open Calendar" data-testid="calendar-toggle">
          <CalendarDays className="h-[1.2rem] w-[1.2rem]" />
        </Button>

        <div id="header-search-portal" className="contents" />

        <Button variant="ghost" size="icon" onClick={handleUsageToggle}>
          <TentTree className="h-[1.2rem] w-[1.2rem]" />
        </Button>

        <History location="header" />

        <HistoryContainer location="header" />
      </div>
    </header>
    </>
  )
}

export default Header
