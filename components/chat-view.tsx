'use client'

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { ChatPanel, ChatPanelRef } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { EmptyScreen } from './empty-screen'
import SuggestionsDropdown from './suggestions-dropdown'
import { PartialRelated } from '@/lib/schema/related'
import { cn } from '@/lib/utils'
import { useCalendarToggle } from './calendar-toggle-context'
import { CalendarNotepad } from './calendar-notepad'
import { useUIState, useAIState } from 'ai/rsc'
import { updateDrawingContext } from '@/lib/actions/chat';
import { useMapData } from './map/map-data-context'

export interface ChatViewRef {
  handleAttachment: () => void;
  handleSubmit: () => void;
}

type ChatViewProps = {
  id: string
  isActive?: boolean
  onNewChat?: () => void
}

export const ChatView = forwardRef<ChatViewRef, ChatViewProps>(({ id, isActive = true, onNewChat }, ref) => {
  const [allMessages] = useUIState()
  const [aiState] = useAIState()
  const { isCalendarOpen } = useCalendarToggle()

  // Filter messages for this thread
  const messages = allMessages.filter((m: any) => m.threadId === id)
  const [input, setInput] = useState('')
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState<PartialRelated | null>(null)
  const chatPanelRef = useRef<ChatPanelRef>(null);
  const { mapData, setMapData } = useMapData();

  useEffect(() => {
    setShowEmptyScreen(messages.length === 0)
  }, [messages])

  // Restore map state when tab becomes active
  useEffect(() => {
    if (isActive && aiState.messages) {
      const drawingContextMessage = [...aiState.messages]
        .filter((m: any) => m.threadId === id)
        .reverse()
        .find(m => (m as any).role === 'data');
      if (drawingContextMessage) {
        try {
          const context = JSON.parse(drawingContextMessage.content as string);
          if (context.drawnFeatures || context.cameraState) {
            setMapData(prev => ({
              ...prev,
              drawnFeatures: context.drawnFeatures || prev.drawnFeatures,
              cameraState: context.cameraState || prev.cameraState
            }));
          }
        } catch (e) {
          console.error('Failed to parse drawing context message:', e);
        }
      }
    }
  }, [isActive, aiState.messages, setMapData, id]);

  useEffect(() => {
    if (isSubmitting) {
      chatPanelRef.current?.submitForm()
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  useImperativeHandle(ref, () => ({
    handleAttachment() {
      chatPanelRef.current?.handleAttachmentClick();
    },
    handleSubmit() {
      chatPanelRef.current?.submitForm();
    }
  }));

  useEffect(() => {
    if (isActive && id && mapData.drawnFeatures && mapData.cameraState) {
      updateDrawingContext(id, {
        drawnFeatures: mapData.drawnFeatures,
        cameraState: mapData.cameraState,
      });
    }
  }, [id, mapData.drawnFeatures, mapData.cameraState, isActive]);

  return (
    <div className="flex flex-col space-y-3 md:space-y-4 h-full overflow-y-auto">
      {isCalendarOpen && <CalendarNotepad chatId={id} />}
      <ChatPanel
        messages={messages}
        input={input}
        setInput={setInput}
        onSuggestionsChange={setSuggestions}
        ref={chatPanelRef}
        threadId={id}
        onNewChat={onNewChat}
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
    </div>
  )
})

ChatView.displayName = 'ChatView'
