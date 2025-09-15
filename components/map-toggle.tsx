'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Map, Pencil, Tent } from 'lucide-react'
import { useMapToggle, MapToggleEnum } from './map-toggle-context'

export function MapToggle() {
  const { setMapType } = useMapToggle();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Map className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
          <span className="sr-only">Toggle map mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {setMapType(MapToggleEnum.RealTimeMode)}}>
          Live
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {setMapType(MapToggleEnum.FreeMode)}}>
          My Maps
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {setMapType(MapToggleEnum.DrawingMode)}}>
          <Pencil className="h-[1rem] w-[1rem] mr-2" />
          Draw & Measure
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {setMapType(MapToggleEnum.WebcamMode)}}>
          <Tent className="h-[1rem] w-[1rem] mr-2" />
          Webcams
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
