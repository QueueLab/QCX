'use client'
import { Button } from '@/components/ui/button'
import { ChevronLeft, History as HistoryIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHistoryToggle } from './history-toggle-context'

type HistoryProps = {
  location: 'sidebar' | 'header'
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
      {location === 'header' ? <HistoryIcon size={20} /> : <ChevronLeft size={16} />}
    </Button>
  )
}
