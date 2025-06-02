'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChatPanel } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { Mapbox } from './map/mapbox-map'
import { useUIState, useAIState } from 'ai/rsc'
import { MapUpdateContent } from '@/lib/types' // Import the type
import MobileIconsBar from './mobile-icons-bar'
import { useProfileToggle, ProfileToggleEnum } from "@/components/profile-toggle-context";
import SettingsView from "@/components/settings/settings-view";

type ChatProps = {
  id?: string
}

export function Chat({ id }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [messages] = useUIState()
  const [aiState] = useAIState()
  const [isMobile, setIsMobile] = useState(false)
  const { activeView } = useProfileToggle();

  // Find the latest mapData from the uiState (messages)
  let latestMapUpdate: MapUpdateContent | undefined = undefined;
  if (messages && messages.length > 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const uiMessage = messages[i] as any; // Cast to access mapData
      if (uiMessage.mapData) {
        latestMapUpdate = uiMessage.mapData as MapUpdateContent;
        break;
      }
    }
  }
  
  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
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

  // Mobile layout
  if (isMobile) {
    return (
      <div className="mobile-layout-container">
        <div className="mobile-map-section">
          {activeView ? <SettingsView /> : <Mapbox mapUpdate={latestMapUpdate} />}
        </div>
        <div className="mobile-icons-bar">
          <MobileIconsBar />
        </div>
        <div className="mobile-chat-section">
          <ChatMessages messages={messages} />
          <ChatPanel messages={messages} />
        </div>
      </div>
    )
  }
  
  // Desktop layout
  return (
    <div className="flex justify-start items-start">
      {/* This is the new div for scrolling */}
      <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-12 md:pt-14 pb-4 h-[calc(100vh-10rem)] overflow-y-auto">
        <ChatMessages messages={messages} />
        <ChatPanel messages={messages} />
      </div>
      <div className="w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]">
        {activeView ? <SettingsView /> : <Mapbox mapUpdate={latestMapUpdate} />}
      </div>
    </div>
  )
}
