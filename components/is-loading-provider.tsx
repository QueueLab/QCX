'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface IsLoadingContextType {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
}

const IsLoadingContext = createContext<IsLoadingContextType | undefined>(
  undefined
)

export function IsLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <IsLoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </IsLoadingContext.Provider>
  )
}

export function useIsLoading() {
  const context = useContext(IsLoadingContext)
  if (context === undefined) {
    throw new Error('useIsLoading must be used within an IsLoadingProvider')
  }
  return context
}