'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Map, Pencil, Eye, EyeOff } from 'lucide-react' // Added Eye, EyeOff
import { useMapToggle, MapToggleEnum } from './map-toggle-context'
import { useMapData } from '../map/map-data-context'; // Added useMapData

export function MapToggle() {
  const { mapType, setMapType, isAttachedImageVisible, setIsAttachedImageVisible } = useMapToggle();
  const { mapData } = useMapData();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center space-x-2"> {/* Added a wrapper div */}
      {mapData.attachedImage && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsAttachedImageVisible(!isAttachedImageVisible)}
          title={isAttachedImageVisible ? 'Hide Attached Image' : 'Show Attached Image'}
          className="relative"
        >
          {isAttachedImageVisible ? <Eye className="h-[1.2rem] w-[1.2rem]" /> : <EyeOff className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">{isAttachedImageVisible ? 'Hide Attached Image' : 'Show Attached Image'}</span>
        </Button>
      )}
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
