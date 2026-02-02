'use client'

import { Button } from '@/components/ui/button'
import { Sprout, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHistoryToggle } from './history-toggle-context'

type HistoryProps = {
  location: 'sidebar' | 'header'
  children?: React.ReactNode
}

export function History({ location }: HistoryProps) {
  const { toggleHistory } = useHistoryToggle()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn({
        'rounded-full text-foreground/30': location === 'sidebar'
      })}
      data-testid="history-button"
      onClick={toggleHistory}
    >
      {location === 'header' ? <Menu /> : <ChevronLeft size={16} />}
    </Button>
  )
}
