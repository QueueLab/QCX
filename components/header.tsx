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
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'

export const Header = () => {
  const { toggleCalendar } = useCalendarToggle()
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const { toggleUsage, isUsageOpen } = useUsageToggle()
  const { activeView, closeProfileView } = useProfileToggle()
  const { toggleHistory } = useHistoryToggle()
  const { isSignedIn, isLoaded } = useUser()

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
    <>
      <PurchaseCreditsPopup isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} />
    <header className="fixed w-full p-1 md:p-2 hidden md:flex justify-between items-center z-[60] backdrop-blur bg-background/95 border-b border-border/40">
      <div>
        <a href="/">
          <span className="sr-only">Chat</span>
        </a>
      </div>
      
      <div className="absolute left-1 flex items-center">
        {isLoaded && !isSignedIn && (
          <SignInButton mode="modal">
            <Button variant="ghost" size="icon" data-testid="logo-auth-trigger">
              <Image
                src="/images/logo.svg"
                alt="Logo"
                width={20}
                height={20}
                className="h-5 w-auto"
              />
            </Button>
          </SignInButton>
        )}
        {isLoaded && isSignedIn && (
          <div className="flex items-center justify-center h-10 w-10">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-6 w-6"
                }
              }}
            />
          </div>
        )}
        {!isLoaded && (
          <div className="h-10 w-10 flex items-center justify-center">
             <div className="h-5 w-5 animate-pulse bg-muted rounded-full" />
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={toggleHistory} data-testid="logo-history-toggle" className="ml-2">
           <span className="sr-only">History</span>
           <Search className="h-5 w-5" />
        </Button>

        <h1 className="text-2xl font-poppins font-semibold text-primary ml-2">
          QCX
        </h1>
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
