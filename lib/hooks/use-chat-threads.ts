import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'

export type Thread = {
  id: string
  initialMessages?: any[]
}

export function useChatThreads(initialThread: Thread) {
  const [threads, setThreads] = useState<Thread[]>([initialThread])
  const [activeThreadId, setActiveThreadId] = useState<string>(initialThread.id)

  const addThread = useCallback(() => {
    const newThread = { id: nanoid(), initialMessages: [] }
    setThreads(prev => [...prev, newThread])
    setActiveThreadId(newThread.id)
    return newThread
  }, [])

  const removeThread = useCallback((id: string) => {
    setThreads(prev => {
      if (prev.length <= 1) return prev
      const newThreads = prev.filter(t => t.id !== id)
      if (activeThreadId === id) {
        setActiveThreadId(newThreads[newThreads.length - 1].id)
      }
      return newThreads
    })
  }, [activeThreadId])

  const switchThread = useCallback((id: string) => {
    setActiveThreadId(id)
  }, [])

  return {
    threads,
    setThreads,
    activeThreadId,
    addThread,
    removeThread,
    switchThread
  }
}
