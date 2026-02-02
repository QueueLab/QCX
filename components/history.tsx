'use client'
import { Button } from '@/components/ui/button'
import { Sprout, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { History as HistoryIcon } from 'lucide-react'
import { ChatHistoryClient } from './sidebar/chat-history-client' // Updated import
import { Suspense } from 'react'
import { HistorySkeleton } from './history-skelton'
import { CreditsDisplay } from './credits/credits-display'

type HistoryProps = {
  location: 'sidebar' | 'header'
  children?: React.ReactNode
}

export function History({ location, children }: HistoryProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={cn({
              'rounded-full text-foreground/30': location === 'sidebar'
            })}
            data-testid="history-button"
          >
            {location === 'header' ? <Menu /> : <Sprout size={16} />}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-64 rounded-tr-xl rounded-br-xl" data-testid="history-panel">
        <CreditsDisplay className="mb-4 mt-4" />
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1 text-sm font-normal mb-2">
            <HistoryIcon size={14} />
            History
          </SheetTitle>
        </SheetHeader>
        <div className="my-2 h-full pb-12 md:pb-10">
          <Suspense fallback={<HistorySkeleton />}>
            <ChatHistoryClient />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  )
}
