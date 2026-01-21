'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChatPanel, ChatPanelRef } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { EmptyScreen } from './empty-screen'
import SuggestionsDropdown from './suggestions-dropdown'
import { PartialRelated } from '@/lib/schema/related'
import { cn } from '@/lib/utils'
import { useCalendarToggle } from './calendar-toggle-context'
import { CalendarNotepad } from './calendar-notepad'
import { MapProvider } from './map/map-provider'
import { useUIState, useAIState } from 'ai/rsc'
import MobileIconsBar from './mobile-icons-bar'
import { useProfileToggle, ProfileToggleEnum } from "@/components/profile-toggle-context";
import SettingsView from "@/components/settings/settings-view";
import { MapDataProvider, useMapData } from './map/map-data-context';
import { updateDrawingContext, getChat } from '@/lib/actions/chat';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { type AIMessage, type Chat as ChatType } from '@/lib/types'
import { nanoid } from 'nanoid'
import { HeaderSearchButton } from './header-search-button'
import { CreditsDisplay } from './credits/credits-display'

type ChatProps = {
  id?: string // This is the chatId
}

export function Chat({ id }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [messages, setMessages] = useUIState()
  const [aiState] = useAIState()
  const [isMobile, setIsMobile] = useState(false)
  const { activeView } = useProfileToggle();
  const { isCalendarOpen } = useCalendarToggle()
  const [input, setInput] = useState('')
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<PartialRelated | null>(null)
  const chatPanelRef = useRef<ChatPanelRef>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [chatData, setChatData] = useState<ChatType | null>(null);

  const handleAttachment = () => {
    chatPanelRef.current?.handleAttachmentClick();
  };

  const handleMobileSubmit = () => {
    chatPanelRef.current?.submitForm();
  };
  
  useEffect(() => {
    async function fetchChatData() {
        if (id) {
            const chat = await getChat(id);
            setChatData(chat);
        }
    }
    fetchChatData();
  }, [id]);

  useEffect(() => {
    setShowEmptyScreen(messages.length === 0)
  }, [messages])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!path.includes('search') && messages.length === 1) {
      window.history.replaceState({}, '', `/search/${id}`)
    }
  }, [id, path, messages])

  useEffect(() => {
    if (aiState.messages[aiState.messages.length - 1]?.type === 'response') {
      router.refresh()
    }
  }, [aiState, router])

  const { mapData } = useMapData();

  useEffect(() => {
    if (isSubmitting) {
      chatPanelRef.current?.submitForm()
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  // useEffect to call the server action when drawnFeatures changes
  useEffect(() => {
    if (id && mapData.drawnFeatures && mapData.drawnFeatures.length > 0) {
      console.log('Chat.tsx: drawnFeatures changed, calling updateDrawingContext', mapData.drawnFeatures);
      updateDrawingContext(id, {
        drawnFeatures: mapData.drawnFeatures,
        cameraState: mapData.cameraState,
      });
    }
  }, [id, mapData.drawnFeatures, mapData.cameraState]);

  useEffect(() => {
    if (!id) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`chat-${id}`);

    const subscription = channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}` },
      (payload) => {
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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: 'user-placeholder', online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, messages, setMessages]);


  if (isMobile) {
    return (
      <MapDataProvider>
        <HeaderSearchButton />
        <div className="mobile-layout-container">
          <div className="mobile-map-section">
          {activeView ? <SettingsView chatId={id || ''} /> : <MapProvider />}
        </div>
        <div className="mobile-icons-bar">
          <MobileIconsBar onAttachmentClick={handleAttachment} onSubmitClick={handleMobileSubmit} />
        </div>
        <div className="mobile-chat-input-area">
          <CreditsDisplay className="mb-2 px-4 pt-4" />
          <ChatPanel 
            ref={chatPanelRef} 
            messages={messages} 
            input={input} 
            setInput={setInput} 
            chatId={id || ''} 
            shareableLink={chatData?.sharePath || ''} 
            onSuggestionsChange={setSuggestions}
          />
        </div>
        <div className="mobile-chat-messages-area relative">
          {isCalendarOpen ? (
            <CalendarNotepad chatId={id} />
          ) : showEmptyScreen ? (
            <div className="relative w-full h-full">
              <div className={cn("transition-all duration-300", suggestions ? "blur-md pointer-events-none" : "")}>
                <EmptyScreen
                  submitMessage={message => {
                    setInput(message)
                    setIsSubmitting(true)
                  }}
                />
              </div>
              {suggestions && (
                <div className="absolute inset-0 z-20 flex flex-col items-start p-4">
                  <SuggestionsDropdown
                    suggestions={suggestions}
                    onSelect={query => {
                      setInput(query)
                      setSuggestions(null)
                      // Use a small timeout to ensure state update before submission
                      setTimeout(() => {
                        setIsSubmitting(true)
                      }, 0)
                    }}
                    onClose={() => setSuggestions(null)}
                    className="relative bottom-auto mb-0 w-full shadow-none border-none bg-transparent"
                  />
                </div>
              )}
            </div>
          ) : (
            <ChatMessages messages={messages} />
          )}
        </div>
        </div>
      </MapDataProvider>
    );
  }

  return (
    <MapDataProvider>
      <HeaderSearchButton />
      <div className="flex justify-start items-start">
        {/* This is the new div for scrolling */}
        <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-16 md:pt-20 pb-4 h-[calc(100vh-0.5in)] overflow-y-auto">
        {isCalendarOpen ? (
          <CalendarNotepad chatId={id} />
        ) : (
          <>
            <CreditsDisplay className="mb-2" />
            <ChatPanel 
              ref={chatPanelRef}
              messages={messages} 
              input={input} 
              setInput={setInput} 
              chatId={id || ''} 
              shareableLink={chatData?.sharePath || ''} 
              onSuggestionsChange={setSuggestions}
            />
            <div className="relative">
              {showEmptyScreen ? (
                <>
                  <div className={cn("transition-all duration-300", suggestions ? "blur-md pointer-events-none" : "")}>
                    <EmptyScreen
                      submitMessage={message => {
                        setInput(message)
                        setIsSubmitting(true)
                      }}
                    />
                  </div>
                  {suggestions && (
                    <div className="absolute inset-0 z-20 flex flex-col items-start p-4">
                      <SuggestionsDropdown
                        suggestions={suggestions}
                        onSelect={query => {
                          setInput(query)
                          setSuggestions(null)
                          // Use a small timeout to ensure state update before submission
                          setTimeout(() => {
                            setIsSubmitting(true)
                          }, 0)
                        }}
                        onClose={() => setSuggestions(null)}
                        className="relative bottom-auto mb-0 w-full shadow-none border-none bg-transparent"
                      />
                    </div>
                  )}
                </>
              ) : (
                <ChatMessages messages={messages} />
              )}
            </div>
          </>
        )}
      </div>
        <div
          className="w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]"
          style={{ zIndex: 10 }}
        >
          {activeView ? <SettingsView chatId={id || ''} /> : <MapProvider />}
        </div>
      </div>
    </MapDataProvider>
  );
}
