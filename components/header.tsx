"use client"
import React from 'react'
import Image from 'next/image'
import { useCalendarToggle } from './calendar-toggle-context'
import { useStreaming } from './streaming-context'
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

export const Header = () => {
  const { toggleCalendar } = useCalendarToggle()
  const { isStreaming } = useStreaming()
  return (
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-10 backdrop-blur md:backdrop-blur-none bg-background/80 md:bg-transparent">
      <div>
        <a href="/">
          <span className="sr-only">Chat</span>
        </a>
      </div>
      
      <div className="absolute left-1">
        <Button variant="ghost" size="icon">
          <Image 
            src="/images/logo.svg" 
            alt="Logo" 
            width={24} 
            height={24} 
            className={cn(
              "h-6 w-auto transition-transform duration-1000",
              isStreaming && "animate-spin-ccw"
            )} 
          />
        </Button>
      </div>
      
      <div className="w-1/2 gap-20 hidden md:flex justify-between px-10 items-center z-10">
        
          <ProfileToggle/>
        
        <MapToggle />
        
        <Button variant="ghost" size="icon" onClick={toggleCalendar} title="Open Calendar">
          <CalendarDays className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        
        <div id="header-search-portal" />
        
        <a href="https://buy.stripe.com/3cIaEX3tRcur9EM7tbasg00" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon">
            <TentTree className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </a>
        
        <ModeToggle />
        
        <HistoryContainer location="header" />
      </div>

      {/* Mobile menu buttons */}
      <div className="flex md:hidden gap-2">
        <div id="mobile-header-search-portal" />
        
        <a href="https://buy.stripe.com/3cIaEX3tRcur9EM7tbasg00" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon">
            <TentTree className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </a>
        <ProfileToggle/>
      </div>
    </header>
  )
}

export default Header