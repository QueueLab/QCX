'use client'

import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react"

interface HistoryToggleContextType {
  isHistoryOpen: boolean
  toggleHistory: () => void
  setHistoryOpen: (open: boolean) => void
}

const HistoryToggleContext = createContext<HistoryToggleContextType | undefined>(undefined)

export const HistoryToggleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const toggleHistory = useCallback(() => setIsHistoryOpen(prev => !prev), [])
  const setHistoryOpen = useCallback((open: boolean) => setIsHistoryOpen(open), [])

  const value = useMemo(() => ({
    isHistoryOpen,
    toggleHistory,
    setHistoryOpen
  }), [isHistoryOpen, toggleHistory, setHistoryOpen])

  return (
    <HistoryToggleContext.Provider value={value}>
      {children}
    </HistoryToggleContext.Provider>
  )
}

export const useHistoryToggle = () => {
  const context = useContext(HistoryToggleContext)
  if (!context) throw new Error('useHistoryToggle must be used within HistoryToggleProvider')
  return context
}
