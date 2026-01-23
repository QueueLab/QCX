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
import { useChat } from 'ai/react'
import { submit } from '@/app/actions'
import MobileIconsBar from './mobile-icons-bar'
import { useProfileToggle } from "@/components/profile-toggle-context"
import SettingsView from "@/components/settings/settings-view"
import { MapDataProvider, useMapData } from './map/map-data-context'
import { updateDrawingContext } from '@/lib/actions/chat'
import { HeaderSearchButton } from './header-search-button'
import { nanoid } from 'nanoid'

type ChatProps = {
  id?: string
  initialMessages?: any[]
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [chatId, setChatId] = useState(id || nanoid())

  const { messages, append, reload, stop, isLoading, input, setInput, handleSubmit } = useChat({
    id: chatId,
    initialMessages,
    api: async (messages, { body }) => {
      return await submit(messages, body)
    },
    body: {
      chatId,
      mapProvider: 'mapbox' // Default map provider
    },
    onFinish: (message) => {
      if (!path.includes('search')) {
        window.history.replaceState({}, '', `/search/${chatId}`)
      }
      router.refresh()
    }
  })

  useEffect(() => {
    const handleResolutionSearch = (event: any) => {
      const { file } = event.detail;
      chatPanelRef.current?.setSelectedFile(file);
      
      // Use a FormData-like object for the body
      append({
        role: 'user',
        content: 'Analyze this map view.'
      }, {
        body: {
          action: 'resolution_search',
          file: file,
          chatId
        }
      });
    };

    window.addEventListener('resolution-search', handleResolutionSearch);
    return () => window.removeEventListener('resolution-search', handleResolutionSearch);
  }, [append, chatId]);

  const [isMobile, setIsMobile] = useState(false)
  const { activeView } = useProfileToggle();
  const { isCalendarOpen } = useCalendarToggle()
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<PartialRelated | null>(null)
  const chatPanelRef = useRef<ChatPanelRef>(null);

  const handleAttachment = () => {
    chatPanelRef.current?.handleAttachmentClick();
  };

  const handleMobileSubmit = () => {
    chatPanelRef.current?.submitForm();
  };
  
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
    if (!path.includes('search') && messages.length > 0) {
      window.history.replaceState({}, '', `/search/${chatId}`)
    }
  }, [chatId, path, messages])

  const { mapData } = useMapData();

  useEffect(() => {
    if (isSubmitting) {
      handleSubmit();
      setIsSubmitting(false)
    }
  }, [isSubmitting, handleSubmit])

  useEffect(() => {
    if (chatId && mapData.drawnFeatures && mapData.cameraState) {
      updateDrawingContext(chatId, {
        drawnFeatures: mapData.drawnFeatures,
        cameraState: mapData.cameraState,
      });
    }
  }, [chatId, mapData.drawnFeatures, mapData.cameraState]);

  if (isMobile) {
    return (
      <MapDataProvider>
        <HeaderSearchButton />
        <div className="mobile-layout-container">
          <div className="mobile-map-section">
          {activeView ? <SettingsView /> : <MapProvider />}
        </div>
        <div className="mobile-icons-bar">
          <MobileIconsBar onAttachmentClick={handleAttachment} onSubmitClick={handleMobileSubmit} />
        </div>
        <div className="mobile-chat-input-area">
          <ChatPanel 
            ref={chatPanelRef} 
            messages={messages} 
            input={input} 
            setInput={setInput}
            onSuggestionsChange={setSuggestions}
            handleSubmit={handleSubmit}
          />
        </div>
        <div className="mobile-chat-messages-area relative">
          {isCalendarOpen ? (
            <CalendarNotepad chatId={chatId} />
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
        <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-16 md:pt-20 pb-4 h-[calc(100vh-0.5in)] overflow-y-auto">
        {isCalendarOpen ? (
          <CalendarNotepad chatId={chatId} />
        ) : (
          <>
            <ChatPanel 
              ref={chatPanelRef}
              messages={messages} 
              input={input} 
              setInput={setInput} 
              onSuggestionsChange={setSuggestions}
              handleSubmit={handleSubmit}
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
          {activeView ? <SettingsView /> : <MapProvider />}
        </div>
      </div>
    </MapDataProvider>
  );
}
