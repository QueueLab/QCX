'use client'

import { useEffect, useRef } from 'react'
import { useMapToggle } from './map/map-toggle-context'
import { AIProvider } from 'ai/react'

// This component would wrap your AI provider to add the map context to messages
export function AIMessageProcessor({ children }: { children: React.ReactNode }) {
  const { screenshotCallback } = useMapToggle()
  const lastProcessedMessageId = useRef<string | null>(null)
  
  // Function to enhance messages with map context
  const processMessages = async (messages) => {
    // Check if there's a new user message that needs map data
    const newUserMessage = messages.find(msg => 
      msg.role === 'user' && 
      msg.id !== lastProcessedMessageId.current &&
      !msg.mapContextAdded // You'd need to add this flag to your message types
    )
    
    if (newUserMessage && screenshotCallback.current) {
      try {
        // Capture screenshot silently
        const mapScreenshot = screenshotCallback.current(true)
        
        if (mapScreenshot) {
          // Clone the messages array to avoid mutating the original
          const enhancedMessages = [...messages]
          
          // Find the index of the message to enhance
          const msgIndex = enhancedMessages.findIndex(m => m.id === newUserMessage.id)
          
          if (msgIndex >= 0) {
            // Enhance the message with map data
            enhancedMessages[msgIndex] = {
              ...enhancedMessages[msgIndex],
              mapContext: {
                screenshot: mapScreenshot,
                timestamp: new Date().toISOString()
              },
              mapContextAdded: true // Mark as processed
            }
            
            // Update the last processed message id
            lastProcessedMessageId.current = newUserMessage.id
            
            // Return the enhanced messages
            return enhancedMessages
          }
        }
      } catch (error) {
        console.error('Error adding map context to message:', error)
      }
    }
    
    // Return the original messages if no enhancement was made
    return messages
  }
  
  return (
    <AIProvider processMessages={processMessages}>
      {children}
    </AIProvider>
  )
}