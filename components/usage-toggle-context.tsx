'use client'

import { createContext, useContext, useState, ReactNode } from "react"

interface UsageToggleContextType {
  isUsageOpen: boolean
  toggleUsage: () => void
}

const UsageToggleContext = createContext<UsageToggleContextType | undefined>(undefined)

export const UsageToggleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUsageOpen, setIsUsageOpen] = useState(false)

  const toggleUsage = () => setIsUsageOpen(prev => !prev)

  return (
    <UsageToggleContext.Provider value={{ isUsageOpen, toggleUsage }}>
      {children}
    </UsageToggleContext.Provider>
  )
}

export const useUsageToggle = () => {
  const context = useContext(UsageToggleContext)
  if (!context) throw new Error('useUsageToggle must be used within UsageToggleProvider')
  return context
}
