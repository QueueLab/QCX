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
import { MapDataProvider, useMapData } from './map/map-data-context';
import { updateDrawingContext } from '@/lib/actions/chat';
import { HeaderSearchButton } from './header-search-button'
import { useOnboardingTour } from './onboarding-tour'

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
  const { startTour } = useOnboardingTour()

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

  // Automatic onboarding tour trigger
  useEffect(() => {
    const tourCompleted = localStorage.getItem('qcx_onboarding_v1')
    if (!tourCompleted && messages.length === 0) {
      const timer = setTimeout(() => {
        console.log("Starting onboarding tour..."); startTour(isMobile)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isMobile, startTour, messages.length])

  const renderSuggestions = () => {
    if (suggestions) {
      return (
        <SuggestionsDropdown
          suggestions={suggestions}
          onSelect={suggestion => {
            setInput(suggestion)
            setSuggestions(null)
            setIsSubmitting(true)
          }}
          onClose={() => setSuggestions(null)}
        />
      )
    }
    return null
  }

  if (isMobile) {
    return (
      <MapDataProvider>
        <HeaderSearchButton />
        <div className="mobile-layout-container">
          <div className="mobile-map-section">
          {activeView ? <SettingsView chatId={id || ''} /> : isUsageOpen ? <UsageView /> : <MapProvider />}
          </div>

          <div className="mobile-chat-section">
            {isCalendarOpen ? (
              <CalendarNotepad chatId={id} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 relative">
                  <div className={cn("transition-all duration-300", suggestions ? "blur-md pointer-events-none" : "")}>
                    {showEmptyScreen ? (
                      <EmptyScreen
                        submitMessage={message => {
                          setInput(message)
                          setIsSubmitting(true)
                        }}
                      />
                    ) : (
                      <ChatMessages messages={messages} />
                    )}
                  </div>
                  {renderSuggestions()}
                </div>

                <ChatPanel
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  onSuggestionsChange={setSuggestions}
                />
              </div>
            )}
          </div>
          <MobileIconsBar
            onAttachmentClick={handleAttachment}
            onSubmitClick={handleMobileSubmit}
          />
        </div>
      </MapDataProvider>
    )
  }

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
                      setIsSubmitting(true)
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
          {activeView ? <SettingsView chatId={id || ''} /> : isUsageOpen ? <UsageView /> : <MapProvider />}
        </div>
      </div>
    </MapDataProvider>
  );
}
