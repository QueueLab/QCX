'use client'

import React, { lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import {
  Search,
  CircleUserRound,
  Map,
  CalendarDays,
  TentTree,
  Paperclip,
  ArrowRight
} from 'lucide-react'
import { History } from '@/components/history'
import { MapToggle } from './map-toggle'
// import { ModeToggle } from './mode-toggle'

const ModeToggle = lazy(() => import('./mode-toggle').then(module => ({ default: module.ModeToggle })));

export const MobileIconsBar: React.FC = () => {
  return (
    <div className="mobile-icons-bar-content">
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
      <Button variant="ghost" size="icon">
        <Paperclip className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <Button variant="ghost" size="icon">
        <ArrowRight className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>
      <History location="header" />
      <Suspense fallback={<div>Loading theme toggle...</div>}><ModeToggle /></Suspense>
    </div>
  )
}

export default MobileIconsBar
