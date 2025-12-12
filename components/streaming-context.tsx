'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface StreamingContextType {
  isStreaming: boolean
  setIsStreaming: (streaming: boolean) => void
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined)

export const useStreaming = () => {
  const context = useContext(StreamingContext)
  if (!context) {
    // Return default values if used outside provider (e.g., during SSR)
    return { isStreaming: false, setIsStreaming: () => {} }
  }
  return context
}

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [isStreaming, setIsStreaming] = useState(false)

  return (
    <StreamingContext.Provider value={{ isStreaming, setIsStreaming }}>
      {children}
    </StreamingContext.Provider>
  )
}
