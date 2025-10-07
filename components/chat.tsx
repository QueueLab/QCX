'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChatPanel, ChatPanelRef } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { EmptyScreen } from './empty-screen'
import { Mapbox } from './map/mapbox-map'
import { useUIState, useAIState } from 'ai/rsc'
import MobileIconsBar from './mobile-icons-bar'
import { useProfileToggle, ProfileToggleEnum } from "@/components/profile-toggle-context";
import SettingsView from "@/components/settings/settings-view";
import { MapDataProvider, useMapData } from './map/map-data-context'; // Add this and useMapData
import { MapProvider } from './map/map-context'
import { updateDrawingContext } from '@/lib/actions/chat'; // Import the server action
import { AnalysisToolProvider } from './analysis-tool-context';

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
  const [input, setInput] = useState('')
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const chatPanelRef = useRef<ChatPanelRef>(null);

  const handleAttachment = () => {
    chatPanelRef.current?.handleAttachmentClick();
  };
  
  useEffect(() => {
    setShowEmptyScreen(messages.length === 0)
  }, [messages])

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024)
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

  // useEffect to call the server action when drawnFeatures changes
  useEffect(() => {
    if (id && mapData.drawnFeatures && mapData.drawnFeatures.length > 0) {
      console.log('Chat.tsx: drawnFeatures changed, calling updateDrawingContext', mapData.drawnFeatures);
      updateDrawingContext(id, mapData.drawnFeatures);
    }
  }, [id, mapData.drawnFeatures]);

  // Mobile layout
  if (isMobile) {
    return (
      <MapDataProvider> {/* Add Provider */}
        <MapProvider>
          <AnalysisToolProvider>
            <div className="mobile-layout-container">
              <div className="mobile-map-section">
              {activeView ? <SettingsView /> : <Mapbox />}
            </div>
            <div className="mobile-icons-bar">
              <MobileIconsBar onAttachmentClick={handleAttachment} />
            </div>
            <div className="mobile-chat-input-area">
              <ChatPanel ref={chatPanelRef} messages={messages} input={input} setInput={setInput} />
            </div>
            <div className="mobile-chat-messages-area">
              {showEmptyScreen ? (
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
          </AnalysisToolProvider>
        </MapProvider>
      </MapDataProvider>
    );
  }
  
  // Desktop layout
  return (
    <MapDataProvider> {/* Add Provider */}
      <MapProvider>
        <AnalysisToolProvider>
          <div className="flex justify-start items-start">
            {/* This is the new div for scrolling */}
          <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-12 md:pt-14 pb-4 h-[calc(100vh-0.5in)] overflow-y-auto">
            <ChatPanel messages={messages} input={input} setInput={setInput} />
            {showEmptyScreen ? (
              <EmptyScreen
                submitMessage={message => {
                  setInput(message)
                }}
              />
            ) : (
              <ChatMessages messages={messages} />
            )}
          </div>
            <div
              className="w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]"
              style={{ zIndex: 10 }} // Added z-index
            >
              {activeView ? <SettingsView /> : <Mapbox />}
            </div>
          </div>
        </AnalysisToolProvider>
      </MapProvider>
    </MapDataProvider>
  );
}
