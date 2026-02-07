'use client'

import { Spinner } from '@/components/ui/spinner'
import { Map } from 'lucide-react'

export function MapStatus({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-background/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-1 my-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
        <Map className="w-4 h-4" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Map Engine</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold whitespace-nowrap">{status}</span>
          <Spinner />
        </div>
      </div>
    </div>
  )
}
