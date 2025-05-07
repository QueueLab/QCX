'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChatPanel } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { Mapbox } from './map/mapbox-map'
import { useUIState, useAIState } from 'ai/rsc'
import MobileIconsBar from './mobile-icons-bar'
import { useMapToggle } from './map/map-toggle-context'

type ChatProps = {
  id?: string
}

export function Chat({ id }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [messages] = useUIState()
  const [aiState] = useAIState()
  const [isMobile, setIsMobile] = useState(false)
  const { screenshotCallback } = useMapToggle()
  const lastMessageCountRef = useRef(messages.length)
  const isUserTypingRef = useRef(false)
  
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
    if (aiState.messages[aiState.messages.length - 1]?.type === 'followup') {
      // Refresh the page to chat history updates
      router.refresh()
    }
  }, [aiState, router])

  // Handle focus on chat input field to detect when user starts typing
  useEffect(() => {
    const chatInput = document.querySelector('textarea[name="input"]')
    
    if (!chatInput) return
    
    const handleFocus = () => {
      isUserTypingRef.current = true
    }
    
    const handleBlur = () => {
      isUserTypingRef.current = false
    }
    
    chatInput.addEventListener('focus', handleFocus)
    chatInput.addEventListener('blur', handleBlur)
    
    return () => {
      chatInput.removeEventListener('focus', handleFocus)
      chatInput.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Automatically capture screenshot when user enters a new message
  useEffect(() => {
    // Check if user has added a new message
    if (messages.length > lastMessageCountRef.current && isUserTypingRef.current) {
      // Capture screenshot silently in the background
      if (screenshotCallback.current) {
        try {
          // Get the screenshot data URL
          const screenshotDataUrl = screenshotCallback.current(true) // Pass true to indicate silent mode
          
          // Here, you would add the screenshot to your message context
          // This depends on how your AI system handles images
          // For example:
          // addImageToContext(screenshotDataUrl)
          
          console.log('Screenshot captured silently in the background')
        } catch (error) {
          console.error('Error capturing background screenshot:', error)
        }
      }
    }
    
    // Update the reference to the current message count
    lastMessageCountRef.current = messages.length
  }, [messages, screenshotCallback])

  // Mobile layout
  if (isMobile) {
    return (
      <div className="mobile-layout-container">
        <div className="mobile-map-section">
          <Mapbox />
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
      <div className="w-1/2 flex flex-col space-y-3 md:space-y-4 px-8 sm:px-12 pt-12 md:pt-14 pb-14 md:pb-24">
        <ChatMessages messages={messages} />
        <ChatPanel messages={messages} />
      </div>
      <div className="w-1/2 p-4 fixed h-[calc(100vh-0.5in)] top-0 right-0 mt-[0.5in]">
        <Mapbox />
      </div>
    </div>
  )
}