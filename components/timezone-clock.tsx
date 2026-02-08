'use client'

import { useEffect, useState } from 'react'
import { useMapData } from './map/map-data-context'
import { motion } from 'framer-motion'

export function TimezoneClock() {
  const { mapData } = useMapData()
  const { currentTimezone } = mapData
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const timezone = currentTimezone || 'UTC'

  // Format: 02:30:05 PM
  const timeString = time.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  // Format: GMT+1 or EST etc.
  const offsetString = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  })
    .formatToParts(time)
    .find((part) => part.type === 'timeZoneName')?.value || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      key={timezone} // Re-animate when timezone changes
      className="mt-6 pt-6 border-t flex flex-col items-center"
    >
      <div className="text-3xl font-mono font-medium tabular-nums tracking-tight text-foreground">
        {timeString}
      </div>
      <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2 uppercase tracking-[0.2em] font-bold">
        <span>{timezone.replace(/_/g, ' ')}</span>
        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        <span>{offsetString}</span>
      </div>
    </motion.div>
  )
}
