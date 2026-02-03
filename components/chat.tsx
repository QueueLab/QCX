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
import { useUsageToggle } from "@/components/usage-toggle-context";
import SettingsView from "@/components/settings/settings-view";
import { UsageView } from "@/components/usage-view";
import { MapDataProvider, useMapData } from './map/map-data-context'; // Add this and useMapData
import { updateDrawingContext } from '@/lib/actions/chat'; // Import the server action
import dynamic from 'next/dynamic'
import { HeaderSearchButton } from './header-search-button'

type ChatProps = {
  id?: string // This is the chatId
}

export function Chat({ id }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [messages] = useUIState()
  const [aiState] = useAIState()
  const [isMobile, setIsMobile] = useState(false)
  const { activeView } = useProfileToggle();
  const { isUsageOpen } = useUsageToggle();
  const { isCalendarOpen } = useCalendarToggle()
  const [input, setInput] = useState('')
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
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Initial check
    checkMobile()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!path.includes('search') && messages.length === 1) {
      window.history.replaceState({}, '', `/search/${id}`)
    }
  }, [id, path, messages])

  useEffect(() => {
    if (aiState.messages[aiState.messages.length - 1]?.type === 'response') {
      // Refresh the page to chat history updates
      router.refresh()
    }
  }, [aiState, router])

  // Get mapData to access drawnFeatures
  const { mapData } = useMapData();

  useEffect(() => {
    if (isSubmitting) {
      chatPanelRef.current?.submitForm()
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  // useEffect to call the server action when drawnFeatures changes
  useEffect(() => {
    if (id && mapData.drawnFeatures && mapData.cameraState) {
      console.log('Chat.tsx: drawnFeatures changed, calling updateDrawingContext', mapData.drawnFeatures);
      updateDrawingContext(id, {
        drawnFeatures: mapData.drawnFeatures,
        cameraState: mapData.cameraState,
      });
    }
  }, [id, mapData.drawnFeatures, mapData.cameraState]);

  const renderSuggestions = () => {
    if (!suggestions) return null;
    return (
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
    );
  };

  // Mobile layout
  if (isMobile) {
    return (
      <MapDataProvider> {/* Add Provider */}
        <HeaderSearchButton />
        <div className="mobile-layout-container">
          <div className="mobile-map-section">
          {activeView ? <SettingsView /> : isUsageOpen ? <UsageView /> : <MapProvider />}
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
          />
        </div>
        <div className="mobile-chat-messages-area relative">
          {isCalendarOpen ? (
            <CalendarNotepad chatId={id} />
          ) : (
            <div className="relative w-full h-full">
              <div className={cn("transition-all duration-300", suggestions ? "blur-md pointer-events-none" : "")}>
                {showEmptyScreen ? (
                  <EmptyScreen
                    submitMessage={message => {
                      setInput(message)
                      setTimeout(() => {
                        setIsSubmitting(true)
                      }, 0)
                    }}
                  />
                ) : (
                  <ChatMessages messages={messages} />
                )}
              </div>
              {renderSuggestions()}
            </div>
          )}
        </div>
        </div>
      </MapDataProvider>
    );
  }

  // Desktop layout
  return (
    <MapDataProvider> {/* Add Provider */}
      <HeaderSearchButton />
      <div className="flex justify-start items-start">
        {/* This is the new div for scrolling */}
        <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-16 md:pt-20 pb-4 h-[calc(100vh-0.5in)] overflow-y-auto">
        {isCalendarOpen ? (
          <CalendarNotepad chatId={id} />
        ) : (
          <>
            <ChatPanel 
              messages={messages} 
              input={input} 
              setInput={setInput} 
              onSuggestionsChange={setSuggestions}
            />
            <div className="relative min-h-[100px]">
              <div className={cn("transition-all duration-300", suggestions ? "blur-md pointer-events-none" : "")}>
                {showEmptyScreen ? (
                  <EmptyScreen
                    submitMessage={message => {
                      setInput(message)
                      setTimeout(() => {
                        setIsSubmitting(true)
                      }, 0)
                    }}
                  />
                ) : (
                  <ChatMessages messages={messages} />
                )}
              </div>
              {renderSuggestions()}
            </div>
          </>
        )}
      </div>
        <div
          className="w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]"
          style={{ zIndex: 10 }} // Added z-index
        >
          {activeView ? <SettingsView /> : isUsageOpen ? <UsageView /> : <MapProvider />}
        </div>
      </div>
    </MapDataProvider>
  );
}
