'use client'

import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react"

interface UsageToggleContextType {
  isUsageOpen: boolean
  toggleUsage: () => void
  closeUsage: () => void
}

const UsageToggleContext = createContext<UsageToggleContextType | undefined>(undefined)

export const UsageToggleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUsageOpen, setIsUsageOpen] = useState(false)

  const toggleUsage = useCallback(() => setIsUsageOpen(prev => !prev), [])
  const closeUsage = useCallback(() => setIsUsageOpen(false), [])

  const value = useMemo(() => ({
    isUsageOpen,
    toggleUsage,
    closeUsage
  }), [isUsageOpen, toggleUsage, closeUsage])

  return (
    <UsageToggleContext.Provider value={value}>
      {children}
    </UsageToggleContext.Provider>
  )
}

export const useUsageToggle = () => {
  const context = useContext(UsageToggleContext)
  if (!context) throw new Error('useUsageToggle must be used within UsageToggleProvider')
  return context
}
