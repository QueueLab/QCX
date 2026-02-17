'use client'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHistoryToggle } from './history-toggle-context'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

type HistoryProps = {
  location: 'sidebar' | 'header'
}

export function History({ location }: HistoryProps) {
  const { toggleHistory } = useHistoryToggle()
  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={cn({
        'rounded-full text-foreground/30': location === 'sidebar'
      })}
      data-testid="history-button"
      onClick={toggleHistory}
      aria-label="Toggle history"
    >
      {location === 'header' ? <Menu /> : <ChevronLeft size={16} />}
    </Button>
  )

  if (location === 'header') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Toggle history</TooltipContent>
      </Tooltip>
    )
  }

  return button
}
