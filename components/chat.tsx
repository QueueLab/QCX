'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from 'ai/react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { type AIMessage, type Chat } from '@/lib/types'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'

interface ChatProps {
  id: string
  initialMessages?: AIMessage[]
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase.channel(`chat:${id}`)

    const subscription = channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}` },
       (payload: any) => {
        const newMessage = payload.new as AIMessage;
        setMessages((prevMessages: AIMessage[]) => {
          if (prevMessages.some((m: AIMessage) => m.id === newMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = Object.keys(newState).map(key => (newState[key][0] as any).user_id);
        setOnlineUsers(users);
      })
       .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: 'user-placeholder', online_at: new Date().toISOString() });
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, supabase])

  const renderContent = (content: any) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((part, i) => {
        if (part.type === 'text') return part.text;
        return null;
      });
    }
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block p-2 rounded-lg ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {renderContent(m.content)}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
         {/* Chat input would go here */}
         <div className="text-xs text-muted-foreground">
            Online users: {onlineUsers.length}
         </div>
      </div>
    </div>
  )
}
