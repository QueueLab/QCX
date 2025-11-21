'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UsageMonitorContextType {
  clickCount: number
  incrementClickCount: () => void
  resetClickCount: () => void
  showPaymentPrompt: boolean
  setShowPaymentPrompt: (show: boolean) => void
}

const UsageMonitorContext = createContext<UsageMonitorContextType | undefined>(undefined)

const STORAGE_KEY = 'qcx_usage_click_count'
const CLICK_THRESHOLD = 5

export function UsageMonitorProvider({ children }: { children: ReactNode }) {
  const [clickCount, setClickCount] = useState<number>(0)
  const [showPaymentPrompt, setShowPaymentPrompt] = useState<boolean>(false)

  // Load click count from localStorage on mount
  useEffect(() => {
    const storedCount = localStorage.getItem(STORAGE_KEY)
    if (storedCount) {
      const count = parseInt(storedCount, 10)
      setClickCount(count)
      // Check if we should show prompt immediately
      if (count >= CLICK_THRESHOLD) {
        setShowPaymentPrompt(true)
      }
    }
  }, [])

  const incrementClickCount = () => {
    setClickCount((prev) => {
      const newCount = prev + 1
      localStorage.setItem(STORAGE_KEY, newCount.toString())
      
      // Trigger payment prompt on 5th click
      if (newCount === CLICK_THRESHOLD) {
        setShowPaymentPrompt(true)
      }
      
      return newCount
    })
  }

  const resetClickCount = () => {
    setClickCount(0)
    localStorage.removeItem(STORAGE_KEY)
    setShowPaymentPrompt(false)
  }

  return (
    <UsageMonitorContext.Provider
      value={{
        clickCount,
        incrementClickCount,
        resetClickCount,
        showPaymentPrompt,
        setShowPaymentPrompt
      }}
    >
      {children}
    </UsageMonitorContext.Provider>
  )
}

export function useUsageMonitor() {
  const context = useContext(UsageMonitorContext)
  if (context === undefined) {
    throw new Error('useUsageMonitor must be used within a UsageMonitorProvider')
  }
  return context
}
