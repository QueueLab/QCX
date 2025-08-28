'use client'

import React from 'react'
import { useSwipeable } from 'react-swipeable'
import { motion, useAnimation } from 'framer-motion'
import { useActions } from 'ai/rsc'
import { AI } from '@/app/actions'

interface SwipeableMessageProps {
  children: React.ReactNode
  messageId: string
}

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  messageId
}) => {
  const { hideMessage } = useActions<typeof AI>()
  const controls = useAnimation()

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      controls.start({ x: '-100%', opacity: 0 }).then(() => {
        hideMessage(messageId)
      })
    },
    onSwiping: (event) => {
      // allow swiping left only
      if (event.dir === 'Left') {
        controls.set({ x: -event.absX })
      }
    },
    onSwiped: (event) => {
        // If not a left swipe, or not swiped far enough, snap back
        if (event.dir !== 'Left') {
            controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } })
        }
    },
    trackMouse: true,
    delta: 100, // minimum swipe distance
    preventScrollOnSwipe: true,
  })

  return (
    <motion.div
      {...handlers}
      animate={controls}
      initial={{ x: 0, opacity: 1 }}
      className="w-full"
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </motion.div>
  )
}
