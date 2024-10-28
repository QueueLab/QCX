'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChatPanel } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { Mapbox } from './map/mapbox-map'
import { useUIState, useAIState } from 'ai/rsc'
import { AccountSettings } from '../app/settings/settings'
type ChatProps = {
  id?: string
}

export function Chat({ id }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [messages] = useUIState()
  const [aiState] = useAIState()

  useEffect(() => {
    if (!path.includes('search') && messages.length === 1) {
      window.history.replaceState({}, '', `/search/${id}`)
    }
  }, [id, path, messages])

  useEffect(() => {
    if (aiState.messages[aiState.messages.length - 1]?.type === 'followup') {
      // Refresh the page to chat history updates
      router.refresh()
    }
  }, [aiState, router])

  return (
    <div className="chat-container flex justify-start items-start">
      <div className="chat-panel w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-12 md:pt-14 pb-14 md:pb-24">
        <ChatMessages messages={messages} />
        <ChatPanel messages={messages} />
      </div>
    
      <div className="map-container w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]">
        <Mapbox position={{ latitude: -3.0674, longitude: 37.3556 }} />
      </div>
    </div>
  )
}
