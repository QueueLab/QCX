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
import { UsageSidebar } from './usage-sidebar'
import { useState } from 'react'

export const Header = () => {
  const { toggleCalendar } = useCalendarToggle()
  const [isUsageOpen, setIsUsageOpen] = useState(false)

  return (
    <>
      <UsageSidebar isOpen={isUsageOpen} onClose={() => setIsUsageOpen(false)} />
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-20 backdrop-blur bg-background/95 border-b border-border/40">
      <div>
        <a href="/">
          <span className="sr-only">Chat</span>
        </a>
      </div>
      
      <div className="absolute left-1 flex items-center">
        <Button variant="ghost" size="icon">
          <Image
            src="/images/logo.svg"
            alt="Logo"
            width={20}
            height={20}
            className="h-5 w-auto"
          />
        </Button>
        <h1 className="text-2xl font-poppins font-semibold text-primary">
          QCX
        </h1>
      </div>
      
      <div className="w-1/2 gap-20 hidden md:flex justify-between px-10 items-center z-10">
        
          <ProfileToggle/>
        
        <MapToggle />
        
        <Button variant="ghost" size="icon" onClick={toggleCalendar} title="Open Calendar" data-testid="calendar-toggle">
          <CalendarDays className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        
        <div id="header-search-portal" />
        
        <Button variant="ghost" size="icon" onClick={() => setIsUsageOpen(true)}>
          <TentTree className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        
        <ModeToggle />
        
        <HistoryContainer location="header" />
      </div>

      {/* Mobile menu buttons */}
      <div className="flex md:hidden gap-2">
        
        <Button variant="ghost" size="icon" onClick={() => setIsUsageOpen(true)}>
          <TentTree className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        <ProfileToggle/>
      </div>
    </header>
    </>
  )
}

export default Header