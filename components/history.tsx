import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
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
}

export function History({ location }: HistoryProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn({
            'rounded-full text-foreground/30': location === 'sidebar'
          })}
          data-testid="history-button"
        >
          {location === 'header' ? <Sprout className="h-[1.2rem] w-[1.2rem] text-primary" /> : <Menu />}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-64 rounded-tl-xl rounded-bl-xl" data-testid="history-panel">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1 text-sm font-normal mb-2">
            <HistoryIcon size={14} />
            History
          </SheetTitle>
        </SheetHeader>
        <CreditsDisplay className="mb-4" />
        <div className="my-2 h-full pb-12 md:pb-10">
          <Suspense fallback={<HistorySkeleton />}>
            <ChatHistoryClient />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  )
}
