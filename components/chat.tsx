'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChatPanel, ChatPanelRef } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { EmptyScreen } from './empty-screen'
import { useCalendarToggle } from './calendar-toggle-context'
import { CalendarNotepad } from './calendar-notepad'
import { Mapbox } from './map/mapbox-map'
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
  const chatPanelRef = useRef<ChatPanelRef>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [chatData, setChatData] = useState<ChatType | null>(null);

  const handleAttachment = () => {
    chatPanelRef.current?.handleAttachmentClick();
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
    if (id && mapData.drawnFeatures && mapData.drawnFeatures.length > 0) {
      updateDrawingContext(id, mapData.drawnFeatures);
    }
  }, [id, mapData.drawnFeatures]);

  useEffect(() => {
    if (!id) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`chat-${id}`);

    const subscription = channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}` },
      (payload) => {
        const newMessage = payload.new as AIMessage;
        if (!messages.some((m: AIMessage) => m.id === newMessage.id)) {
          setMessages((prevMessages: AIMessage[]) => [...prevMessages, newMessage]);
        }
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
          {activeView ? <SettingsView chatId={id || ''} /> : <Mapbox />}
        </div>
        <div className="mobile-icons-bar">
          <MobileIconsBar onAttachmentClick={handleAttachment} />
        </div>
        <div className="mobile-chat-input-area">
          <ChatPanel ref={chatPanelRef} messages={messages} input={input} setInput={setInput} chatId={id || ''} shareableLink={chatData?.sharePath || ''} />
        </div>
        <div className="mobile-chat-messages-area">
          {isCalendarOpen ? (
            <CalendarNotepad chatId={id} />
          ) : showEmptyScreen ? (
            <EmptyScreen
              submitMessage={message => {
                setInput(message)
              }}
            />
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
      <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-12 md:pt-14 pb-4 h-[calc(100vh-0.5in)] overflow-y-auto">
        <ChatPanel messages={messages} input={input} setInput={setInput} chatId={id || ''} shareableLink={chatData?.sharePath || ''} />
        {showEmptyScreen ? (
          <EmptyScreen
            submitMessage={message => {
              setInput(message)
            }}
          />
        ) : (
          <>
            <ChatPanel messages={messages} input={input} setInput={setInput} chatId={''} shareableLink={''} />
            {showEmptyScreen ? (
              <EmptyScreen
                submitMessage={message => {
                  setInput(message)
                }}
              />
            ) : (
              <ChatMessages messages={messages} />
            )}
          </>
        )}
      </div>
        <div
          className="w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]"
          style={{ zIndex: 10 }}
        >
          {activeView ? <SettingsView chatId={id || ''} /> : <Mapbox />}
        </div>
      </div>
    </MapDataProvider>
  );
}
