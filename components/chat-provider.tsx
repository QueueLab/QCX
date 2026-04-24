'use client'

import React, { createContext, useContext, useCallback, useMemo } from 'react'
import { useChat, type Message } from 'ai/react'
import type { PartialInquiry } from '@/lib/schema/inquiry'
import type { PartialRelated } from '@/lib/schema/related'

export interface Annotation {
  type: string
  [key: string]: any
}

interface ChatContextValue {
  messages: Message[]
  input: string
  setInput: (value: string) => void
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>, options?: any) => void
  append: (message: { role: 'user'; content: string }, options?: any) => Promise<string | null | undefined>
  setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void
  isLoading: boolean
  chatId: string
  annotations: Annotation[]
  getToolResults: (toolName: string) => any[]
  getInquiry: () => PartialInquiry | null
  getRelatedQueries: () => PartialRelated | null
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

interface ChatProviderProps {
  chatId: string
  initialMessages?: Message[]
  children: React.ReactNode
}

export function ChatProvider({ chatId, initialMessages, children }: ChatProviderProps) {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    setMessages,
    isLoading,
    data,
  } = useChat({
    api: '/api/chat/stream',
    id: chatId,
    initialMessages,
    body: { chatId },
  })

  const annotations = useMemo(() => (data as Annotation[] | undefined) || [], [data])

  const getToolResults = useCallback((toolName: string) => {
    return annotations
      .filter((a) => a.type === 'tool_result' && a.toolName === toolName)
      .map((a) => a.result)
  }, [annotations])

  const getInquiry = useCallback((): PartialInquiry | null => {
    const inquiry = annotations.find((a) => a.type === 'inquiry')
    return inquiry?.data || null
  }, [annotations])

  const getRelatedQueries = useCallback((): PartialRelated | null => {
    const related = annotations.findLast?.((a) => a.type === 'related')
    return related?.relatedQueries || null
  }, [annotations])

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        setInput,
        handleSubmit,
        append: append as any,
        setMessages,
        isLoading,
        chatId,
        annotations,
        getToolResults,
        getInquiry,
        getRelatedQueries,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
