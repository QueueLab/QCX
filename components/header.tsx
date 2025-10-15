'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ModeToggle } from './mode-toggle'
import HistoryContainer from './history-container'
import { Button } from '@/components/ui/button'
import {
  CalendarDays,
  TentTree
} from 'lucide-react'
import { MapToggle } from './map-toggle'
import { ProfileToggle } from './profile-toggle'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarNotepad } from "./calendar-notepad"


export const Header = () => {
  const [isCalendarOpen, setCalendarOpen] = useState(false)
  return (
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-10 backdrop-blur md:backdrop-blur-none bg-background/80 md:bg-transparent">
      <div>
        <a href="/">
          <span className="sr-only">Chat</span>
        </a>
      </div>
      
      <div className="absolute left-1">
        <Button variant="ghost" size="icon">
          <Image src="/images/logo.svg" alt="Logo" width={24} height={24} className="h-6 w-auto" />
        </Button>
      </div>
      
      <div className="w-1/2 gap-20 hidden md:flex justify-between px-10 items-center z-10">
        
          <ProfileToggle/>
        
        <MapToggle />
        
        <Dialog open={isCalendarOpen} onOpenChange={setCalendarOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <CalendarDays className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Calendar Notepad</DialogTitle>
            </DialogHeader>
            <CalendarNotepad />
          </DialogContent>
        </Dialog>
        
        <div id="header-search-portal" />
        
        <Button variant="ghost" size="icon">
          <TentTree className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        
        <ModeToggle />
        
        <HistoryContainer location="header" />
      </div>

      {/* Mobile menu buttons */}
      <div className="flex md:hidden gap-2">
        <div id="mobile-header-search-portal" />
        
        <ProfileToggle/>
      </div>
    </header>
  )
}

export default Header