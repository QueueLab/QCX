'use client'

import { useSwipeable } from 'react-swipeable'
import { StreamableValue, useActions } from 'ai/rsc'

interface SwipeableMessageProps {
  message: {
    id: string
    components: React.ReactNode[]
    isCollapsed?: StreamableValue<boolean>
  }
  children: React.ReactNode
}

export function SwipeableMessage({
  message,
  children
}: SwipeableMessageProps) {
  const { hideMessage } = useActions()

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      console.log(`Swiped left on message ${message.id}`)
      hideMessage(message.id)
    },
    trackMouse: true
  })

  return <div {...handlers}>{children}</div>
}
