'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { TentTree, RadioTower } from 'lucide-react'
import { useMapToggle, MapToggleEnum } from './map-toggle-context'

export function SensorToggle() {
  const { setMapType } = useMapToggle();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <TentTree className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {setMapType(MapToggleEnum.SensorMode)}}>
          <RadioTower className="h-[1rem] w-[1.2rem] mr-2" />
          Sensors
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
