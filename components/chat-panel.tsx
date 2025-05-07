'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AI, UIState } from '@/app/actions'
import { useUIState, useActions } from 'ai/rsc'
import { cn } from '@/lib/utils'
import { UserMessage } from './user-message'
import { Button } from './ui/button'
import { ArrowRight, Plus, Paperclip } from 'lucide-react'
import { EmptyScreen } from './empty-screen'
import Textarea from 'react-textarea-autosize'
import { nanoid } from 'nanoid'

interface ChatPanelProps {
  messages: UIState
}

export function ChatPanel({ messages }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [, setMessages] = useUIState<typeof AI>()
  const { submit } = useActions()
  const [isButtonPressed, setIsButtonPressed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const router = useRouter()

  // Detect mobile layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isButtonPressed) {
      inputRef.current?.focus()
      setIsButtonPressed(false)
    }
  }, [isButtonPressed])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isButtonPressed) {
      handleClear()
      setIsButtonPressed(false)
    }
    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        component: <UserMessage message={input} />
      }
    ])
    const formData = new FormData(e.currentTarget)
    const responseMessage = await submit(formData)
    setMessages(currentMessages => [...currentMessages, responseMessage as any])
  }

  const handleClear = () => {
    router.push('/')
  }

  useEffect(() => {
    inputRef.current?.focus(); 
  }, [])

  // New chat button (appears when there are messages)
  if (messages.length > 0 && !isButtonPressed) {
    return (
      <div
        className={cn(
          'fixed bottom-2 left-2 flex justify-start items-center pointer-events-none',
          isMobile ? 'w-full px-2' : 'md:bottom-8'
        )}
      >
        <Button
          type="button"
          variant={'secondary'}
          className="rounded-full bg-secondary/80 group transition-all hover:scale-105 pointer-events-auto"
          onClick={() => handleClear()}
        >
          <span className="text-sm mr-2 group-hover:block hidden animate-in fade-in duration-300">
            New
          </span>
          <Plus size={18} className="group-hover:rotate-90 transition-all" />
        </Button>
      </div>
    )
  }

  // Function to capture a screenshot of the map
  const captureScreenshot = () => {
    const mapElement = document.querySelector('.mapboxgl-canvas');
    if (!mapElement) return null;

    const canvas = mapElement as HTMLCanvasElement;
    return canvas.toDataURL('image/png');
  };

  // Function to send the captured image to the Model
  const sendImageToModel = (imageData: string) => {
    // Logic to send the image data to the Model for multi-modal understanding
    console.log('Sending image to model:', imageData);
  };

  // Listen for user input after using mapping tools
  useEffect(() => {
    const handleUserInput = () => {
      const screenshot = captureScreenshot();
      if (screenshot) {
        sendImageToModel(screenshot);
      }
    };

    window.addEventListener('userInput', handleUserInput);

    return () => {
      window.removeEventListener('userInput', handleUserInput);
    };
  }, []);

  return (
    <div
      className={cn(
        // Base styles for desktop
        'fixed left-2 flex flex-col items-start justify-center',
        isMobile
          ? 'mobile-chat-section' // Use mobile-chat-section class for mobile layout
          : 'top-10 bottom-8 md:w-1/2 w-full px-4 md:px-6'
      )}
    >
      <form onSubmit={handleSubmit} className="max-w-full w-full">
        <div
          className={cn(
            'relative flex items-start w-full',
            isMobile && 'mobile-chat-input' // Apply mobile chat input styling
          )}
        >
          <Textarea
            ref={inputRef}
            name="input"
            rows={1}
            maxRows={isMobile ? 3 : 5}
            tabIndex={0}
            placeholder="Explore"
            spellCheck={false}
            value={input}
            className={cn(
              'resize-none w-full min-h-12 rounded-fill border border-input pl-4 pr-20 pt-3 pb-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              isMobile
                ? 'mobile-chat-input input bg-background' // Use mobile input styles
                : 'bg-muted pr-20'
            )}
            onChange={e => {
              setInput(e.target.value)
              setShowEmptyScreen(e.target.value.length === 0)
            }}
            onKeyDown={e => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                if (input.trim().length === 0) {
                  e.preventDefault()
                  return
                }
                e.preventDefault()
                const textarea = e.target as HTMLTextAreaElement
                textarea.form?.requestSubmit()
              }
            }}
            onHeightChange={height => {
              if (!inputRef.current) return
              const initialHeight = 70
              const initialBorder = 32
              const multiple = (height - initialHeight) / 20
              const newBorder = initialBorder - 4 * multiple
              inputRef.current.style.borderRadius =
                Math.max(8, newBorder) + 'px'
            }}
            onFocus={() => setShowEmptyScreen(true)}
            onBlur={() => setShowEmptyScreen(false)}
          />
          <Button
            type="button"
            variant={'ghost'}
            size={'icon'}
            className={cn(
              'absolute top-1/2 transform -translate-y-1/2',
              isMobile ? 'right-8' : 'right-10'
            )}
          >
            <Paperclip size={isMobile ? 18 : 20} />
          </Button>
          <Button
            type="submit"
            size={'icon'}
            variant={'ghost'}
            className={cn(
              'absolute top-1/2 transform -translate-y-1/2',
              isMobile ? 'right-1' : 'right-2'
            )}
            disabled={input.length === 0}
          >
            <ArrowRight size={isMobile ? 18 : 20} />
          </Button>
        </div>
        <EmptyScreen
          submitMessage={message => {
            setInput(message)
          }}
          className={cn(showEmptyScreen ? 'visible' : 'invisible')}
        />
      </form>
    </div>
  )
}
