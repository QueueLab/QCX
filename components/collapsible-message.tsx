'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@radix-ui/react-collapsible'
import { Button } from './ui/button'
import { ChevronDown } from 'lucide-react'
import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'

interface CollapsibleMessageProps {
  message: {
    id: string
    isCollapsed?: StreamableValue<boolean>
    component: React.ReactNode
  }
  isLastMessage?: boolean
  index?: number
}

export const CollapsibleMessage: React.FC<CollapsibleMessageProps> = ({
  message,
  isLastMessage = false,
  index = 0
}) => {
  const [data] = useStreamableValue(message.isCollapsed)
  const isCollapsed = data ?? false
  const [open, setOpen] = useState(isLastMessage)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' })

  useEffect(() => {
    setOpen(isLastMessage)
  }, [isCollapsed, isLastMessage])

  const staggerDelay = index * 0.08

  // if not collapsed, return the component with entrance animation
  if (!isCollapsed) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: staggerDelay }}
      >
        {message.component}
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: staggerDelay }}
    >
      <Collapsible
        open={open}
        onOpenChange={value => {
          setOpen(value)
        }}
      >
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'w-full flex justify-end',
              !isCollapsed ? 'hidden' : ''
            )}
          >
            <Button
              variant="ghost"
              size={'icon'}
              className={cn('-mt-3 rounded-full')}
            >
              <ChevronDown
                size={14}
                className={cn(
                  open ? 'rotate-180' : 'rotate-0',
                  'h-4 w-4 transition-all'
                )}
              />
              <span className="sr-only">collapse</span>
            </Button>
          </div>
        </CollapsibleTrigger>
        <AnimatePresence>
          {open && (
            <CollapsibleContent asChild forceMount>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {message.component}
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
        {!open && <Separator className="my-2 bg-muted" />}
      </Collapsible>
    </motion.div>
  )
}
