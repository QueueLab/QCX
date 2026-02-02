'use client'

import { createContext, useContext, useState, ReactNode } from "react"

interface HistoryToggleContextType {
  isHistoryOpen: boolean
  toggleHistory: () => void
  setHistoryOpen: (open: boolean) => void
}

const HistoryToggleContext = createContext<HistoryToggleContextType | undefined>(undefined)

export const HistoryToggleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const toggleHistory = () => setIsHistoryOpen(prev => !prev)
  const setHistoryOpen = (open: boolean) => setIsHistoryOpen(open)

  return (
    <HistoryToggleContext.Provider value={{ isHistoryOpen, toggleHistory, setHistoryOpen }}>
      {children}
    </HistoryToggleContext.Provider>
  )
}

export const useHistoryToggle = () => {
  const context = useContext(HistoryToggleContext)
  if (!context) throw new Error('useHistoryToggle must be used within HistoryToggleProvider')
  return context
}
