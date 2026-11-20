'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@radix-ui/react-collapsible'
import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { Check, ChevronDown, CircleAlert, LoaderCircle, ListChecks } from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import type { CarouselApi } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import type { ActionTrace, ActionTraceStep } from '@/lib/types/action-trace'

interface ActionTracePanelProps {
  trace: StreamableValue<ActionTrace>
}

function StepIcon({ status }: { status: ActionTraceStep['status'] }) {
  if (status === 'complete') return <Check aria-hidden="true" className="h-3.5 w-3.5" />
  if (status === 'error') return <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
  return <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
}

export function ActionTracePanel({ trace: stream }: ActionTracePanelProps) {
  const [trace] = useStreamableValue(stream)
  const [open, setOpen] = useState(true)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const steps = useMemo(() => trace?.steps ?? [], [trace?.steps])
  const activeIndex = useMemo(() => {
    const newestRunningIndex = [...steps].reverse().findIndex(step => step.status === 'active')
    return newestRunningIndex >= 0
      ? steps.length - 1 - newestRunningIndex
      : Math.max(steps.length - 1, 0)
  }, [steps])
  const activeStep = steps[activeIndex]
  const hasError = Boolean(trace?.hasError) || steps.some(step => step.status === 'error')
  const summary = trace?.completed
    ? hasError ? 'Completed with an issue' : 'Actions complete'
    : activeStep?.label || 'Preparing your response'

  useEffect(() => {
    if (carouselApi && steps.length > 0) carouselApi.scrollTo(activeIndex)
  }, [activeIndex, carouselApi, steps.length])

  if (!steps.length) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-3 w-full">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${summary}. ${open ? 'Hide' : 'Show'} action trace`}
          data-testid="action-trace-toggle"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
            {trace?.completed ? <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> : <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {trace?.completed ? 'Action trace' : 'Working'}
            </span>
            <span className="block truncate text-xs font-medium text-foreground">{summary}</span>
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{steps.length} {steps.length === 1 ? 'step' : 'steps'}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden">
        <div className="px-8 pb-1 pt-2">
          <Carousel setApi={setCarouselApi} opts={{ align: 'start', loop: false }} className="px-8">
            <CarouselContent>
              {steps.map((step, index) => (
                <CarouselItem key={step.id}>
                  <div className="min-h-[68px] rounded-lg border border-border/70 bg-card px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        step.status === 'active' && 'bg-primary/10 text-primary',
                        step.status === 'complete' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        step.status === 'error' && 'bg-destructive/10 text-destructive'
                      )}>
                        <StepIcon status={step.status} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{step.label}</span>
                        {step.detail && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{step.detail}</span>}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{index + 1}/{steps.length}</span>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {steps.length > 1 && (
              <>
                <CarouselPrevious className="left-0 h-7 w-7" aria-label="Previous action" />
                <CarouselNext className="right-0 h-7 w-7" aria-label="Next action" />
              </>
            )}
          </Carousel>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
