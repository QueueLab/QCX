import React from 'react'
import { ModeToggle } from './mode-toggle'
import { IconLogo } from './ui/icons'
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

export const Header: React.FC = async () => {
  return (
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-10 backdrop-blur md:backdrop-blur-none bg-background/80 md:bg-transparent">
      <div>
        <a href="/">
        
    
          <span className="sr-only">Chat</span>
        </a>
      </div>
      <div className="absolute left-1">
        <Button variant="ghost" size="icon">
          <img src="/images/logo.svg" alt="Logo" className="h-6" />
        </Button>
      </div>
      <div className="w-1/2 gap-20 flex justify-between px-10 items-center z-10">
        <Button variant="ghost" size="icon">
          <CircleUserRound className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        <MapToggle />
        <Button variant="ghost" size="icon">
          <CalendarDays className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        </Button>
        <Button variant="ghost" size="icon">
          <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        </Button>
        <Button variant="ghost" size="icon">
          <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
        </Button>
        <ModeToggle />
        <HistoryContainer location="header" />
      </div>
    </header>
  )
}

export default Header
