'use client'

import { createContext, useContext, useState, ReactNode, useTransition } from 'react'

interface CalendarToggleContextType {
  isCalendarOpen: boolean
  toggleCalendar: () => void
}

const CalendarToggleContext = createContext<CalendarToggleContextType | undefined>(undefined)

export const useCalendarToggle = () => {
  const context = useContext(CalendarToggleContext)
  if (!context) {
    throw new Error('useCalendarToggle must be used within a CalendarToggleProvider')
  }
  return context
}

export const CalendarToggleProvider = ({ children }: { children: ReactNode }) => {
  const [isPending, startTransition] = useTransition()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const toggleCalendar = () => {
    startTransition(() => {
      setIsCalendarOpen(prevState => !prevState)
    })
  }

  return (
    <CalendarToggleContext.Provider value={{ isCalendarOpen, toggleCalendar }}>
      {children}
    </CalendarToggleContext.Provider>
  )
}
