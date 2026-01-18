'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from 'ai/react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { type AIMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'

interface ChatProps {
  id: string
  initialMessages?: AIMessage[]
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    api: '/api/chat',
    id,
    initialMessages: initialMessages as any,
  })
  
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const channel = supabase.channel(`chat:${id}`)

    const subscription = channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}` },
       (payload: any) => {
        const newMessage = payload.new as AIMessage;
        setMessages((prevMessages: any) => {
          if (prevMessages.some((m: any) => m.id === newMessage.id)) {
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
  }, [id, supabase, setMessages])

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
         <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
           <Input
             value={input}
             onChange={handleInputChange}
             placeholder="Type a message..."
             className="flex-1"
           />
           <Button type="submit" size="icon">
             <Send className="h-4 w-4" />
           </Button>
         </form>
         <div className="text-xs text-muted-foreground">
            Online users: {onlineUsers.length}
         </div>
      </div>
    </div>
  )
}
