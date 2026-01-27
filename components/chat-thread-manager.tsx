'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatView, ChatViewRef } from './chat-view'
import { Button } from './ui/button'
import { Plus, X, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MapProvider } from './map/map-provider'
import { useProfileToggle } from "@/components/profile-toggle-context";
import SettingsView from "@/components/settings/settings-view";
import { HeaderSearchButton } from './header-search-button'
import { useChatThreads, Thread } from '@/lib/hooks/use-chat-threads'
import MobileIconsBar from './mobile-icons-bar'
import { useUIState } from 'ai/rsc'
import { AI } from '@/app/ai'

export function ChatThreadManager({ initialThread }: { initialThread: Thread }) {
  const [messages] = useUIState<typeof AI>()
  const { threads, activeThreadId, addThread, removeThread, switchThread, setThreads } = useChatThreads(initialThread)
  const { activeView } = useProfileToggle();
  const [isMobile, setIsMobile] = useState(false)
  const chatViewRefs = useRef<Map<string, ChatViewRef>>(new Map())

  // Initialize threads from messages if any exist for different IDs
  useEffect(() => {
    if (messages.length > 0) {
      const threadIds = Array.from(new Set(messages.map(m => m.threadId).filter(Boolean))) as string[]
      if (threadIds.length > 0) {
        setThreads(prev => {
          const existingIds = prev.map(t => t.id)
          const newThreads = [...prev]
          threadIds.forEach(id => {
            if (!existingIds.includes(id)) {
              newThreads.push({ id, initialMessages: [] })
            }
          })
          return newThreads
        })
      }
    }
  }, [messages, setThreads])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleAttachment = () => {
    if (activeThreadId) {
      chatViewRefs.current.get(activeThreadId)?.handleAttachment()
    }
  }

  const handleSubmit = () => {
    if (activeThreadId) {
      chatViewRefs.current.get(activeThreadId)?.handleSubmit()
    }
  }

  if (isMobile) {
    return (
      <div className="mobile-layout-container">
        <div className="mobile-map-section">
          {activeView ? <SettingsView /> : <MapProvider />}
        </div>

        {threads.map(t => (
          <div key={t.id} className={cn("contents", activeThreadId === t.id ? "block" : "hidden")}>
              {activeThreadId === t.id && (
                <>
                  <HeaderSearchButton threadId={t.id} />
                  <div className="mobile-icons-bar">
                    <MobileIconsBar
                      onAttachmentClick={handleAttachment}
                      onSubmitClick={handleSubmit}
                      onNewChat={() => addThread()}
                    />
                  </div>
                </>
              )}
              <div className={cn("mobile-chat-messages-area relative flex flex-col", activeThreadId === t.id ? "flex" : "hidden")}>
                <div className="flex items-center gap-2 p-2 border-b overflow-x-auto bg-muted/30 no-scrollbar">
                  {threads.map(thread => (
                    <div
                      key={thread.id}
                      onClick={() => switchThread(thread.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 text-xs rounded-full whitespace-nowrap border cursor-pointer",
                        activeThreadId === thread.id ? "bg-primary text-primary-foreground" : "bg-background shadow-sm"
                      )}
                    >
                      <MessageSquare size={12} />
                      <span>{thread.id === initialThread.id ? 'Main' : thread.id.slice(0, 4)}</span>
                    </div>
                  ))}
                  <Button variant="outline" size="icon" className="h-6 w-6 rounded-full shrink-0" onClick={() => addThread()}>
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <ChatView
                    id={t.id}
                    isActive={activeThreadId === t.id}
                    onNewChat={() => addThread()}
                    ref={el => {
                      if (el) chatViewRefs.current.set(t.id, el)
                      else chatViewRefs.current.delete(t.id)
                    }}
                  />
                </div>
              </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-start items-start w-full h-screen pt-[0.5in]">
        <div className="w-1/2 flex flex-col h-full border-r bg-background">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-4 pt-2 border-b overflow-x-auto bg-muted/30 no-scrollbar min-h-[45px]">
            {threads.map(thread => (
              <div
                key={thread.id}
                onClick={() => switchThread(thread.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-md cursor-pointer transition-colors whitespace-nowrap border-t border-l border-r",
                  activeThreadId === thread.id
                    ? "bg-background shadow-sm border-b-background -mb-[1px] z-10"
                    : "hover:bg-muted border-transparent text-muted-foreground"
                )}
              >
                <MessageSquare size={14} />
                <span>{thread.id === initialThread.id ? 'Main Chat' : `Chat ${thread.id.slice(0, 4)}`}</span>
                {threads.length > 1 && (
                  <X
                    size={14}
                    className="ml-1 hover:text-destructive rounded-full hover:bg-muted-foreground/20 p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeThread(thread.id);
                    }}
                  />
                )}
              </div>
            ))}
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 mb-1" onClick={() => addThread()}>
              <Plus size={18} />
            </Button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden relative">
            {threads.map(thread => (
              <div
                key={thread.id}
                className={cn("h-full w-full px-8 sm:px-12 pt-4 pb-4 overflow-y-auto", activeThreadId === thread.id ? "block" : "hidden")}
              >
                   {activeThreadId === thread.id && <HeaderSearchButton threadId={thread.id} />}
                   <ChatView
                      id={thread.id}
                      isActive={activeThreadId === thread.id}
                      onNewChat={() => addThread()}
                      ref={el => {
                        if (el) chatViewRefs.current.set(thread.id, el)
                        else chatViewRefs.current.delete(thread.id)
                      }}
                   />
              </div>
            ))}
          </div>
        </div>

        {/* Shared Map/Settings View */}
        <div
          className="w-1/2 h-full relative"
        >
          <div className="absolute inset-0 p-4">
            <div className="h-full w-full rounded-xl overflow-hidden shadow-md border border-border">
              {activeView ? <SettingsView /> : <MapProvider />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
