'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { History as HistoryIcon } from 'lucide-react'
import { ChatHistoryClient } from './sidebar/chat-history-client'
import { Suspense } from 'react'
import { HistorySkeleton } from './history-skelton'
import { useHistoryToggle } from './history-toggle-context'

export function HistorySidebar() {
  const { isHistoryOpen, setHistoryOpen } = useHistoryToggle()

  return (
    <Sheet open={isHistoryOpen} onOpenChange={setHistoryOpen}>
      <SheetContent className="w-64 rounded-tl-xl rounded-bl-xl" data-testid="history-panel">
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
