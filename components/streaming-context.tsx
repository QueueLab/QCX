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
    throw new Error('useStreaming must be used within a StreamingProvider')
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
