'use client'

import { useChat } from '@ai-sdk/react';
import { ChatPanel } from './chat-panel';
import { ChatMessages } from './chat-messages';
import { EmptyScreen } from './empty-screen';
import { Mapbox } from './map/mapbox-map';
import MobileIconsBar from './mobile-icons-bar';
import { useProfileToggle, ProfileToggleEnum } from "@/components/profile-toggle-context";
import SettingsView from "@/components/settings/settings-view";
import { MapDataProvider, useMapData } from './map/map-data-context';
import { useEffect, useState } from 'react';
import { AIMessage } from '@/lib/types';

type ChatProps = {
  id?: string
}

export function Chat({ id }: ChatProps) {
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    api: '/api/chat',
    id,
    onFinish(message) {
      // Refresh the page to chat history updates
      // router.refresh()
    }
  });

  const [isMobile, setIsMobile] = useState(false)
  const { activeView } = useProfileToggle();
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)

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

  // Mobile layout
  if (isMobile) {
    return (
      <MapDataProvider>
        <div className="mobile-layout-container">
          <div className="mobile-map-section">
            {activeView ? <SettingsView /> : <Mapbox />}
          </div>
          <div className="mobile-icons-bar">
            <MobileIconsBar />
          </div>
          <div className="mobile-chat-input-area">
            <form onSubmit={handleSubmit}>
              <ChatPanel messages={messages as AIMessage[]} input={input} setInput={handleInputChange} />
            </form>
          </div>
          <div className="mobile-chat-messages-area">
            {showEmptyScreen ? (
              <EmptyScreen
                submitMessage={message => {
                  // setInput(message)
                }}
              />
            ) : (
              <ChatMessages messages={messages as AIMessage[]} />
            )}
          </div>
        </div>
      </MapDataProvider>
    );
  }
  
  // Desktop layout
  return (
    <MapDataProvider>
      <div className="flex justify-start items-start">
        <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-12 md:pt-14 pb-4 h-[calc(100vh-0.5in)] overflow-y-auto">
          <ChatMessages messages={messages as AIMessage[]} />
          <form onSubmit={handleSubmit}>
            <ChatPanel messages={messages as AIMessage[]} input={input} setInput={handleInputChange} />
          </form>
        </div>
        <div
          className="w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]"
          style={{ zIndex: 10 }}
        >
          {activeView ? <SettingsView /> : <Mapbox />}
        </div>
      </div>
    </MapDataProvider>
  );
}
