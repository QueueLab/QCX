'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AI, UIState } from '@/app/actions'
import { useMapData } from './map/map-data-context' // Corrected path
import { useUIState, useActions } from 'ai/rsc'
import { cn } from '@/lib/utils'
import { UserMessage } from './user-message'
import { Button } from './ui/button'
import { ArrowRight, Plus, Paperclip, XCircle } from 'lucide-react' // Added XCircle
import Textarea from 'react-textarea-autosize'
import { nanoid } from 'nanoid'

interface ChatPanelProps {
  messages: UIState
  input: string
  setInput: (value: string) => void
}

export function ChatPanel({ messages, input, setInput }: ChatPanelProps) {
  const [, setMessages] = useUIState<typeof AI>()
  const { submit } = useActions()
  const [isButtonPressed, setIsButtonPressed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mapData, setMapData } = useMapData() // Added mapData here
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setMapData(prev => ({ ...prev, attachedImage: reader.result as string }))
      }
      reader.readAsDataURL(file)
      // Reset file input value to allow selecting the same file again
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const removeAttachedImage = () => {
    setMapData(prev => ({ ...prev, attachedImage: null }));
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [])

  // New chat button (appears when there are messages)
  if (messages.length > 0 && !isButtonPressed && !isMobile) {
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

  return (
    <div
      className={cn(
        'flex flex-col items-start',
        isMobile
          ? 'w-full h-full'
          : 'sticky bottom-0 bg-background z-10 w-full border-t border-border px-2 py-3 md:px-4'
      )}
    >
      <form
        onSubmit={handleSubmit}
        className={cn('max-w-full w-full', isMobile ? 'px-2 pb-2 pt-1 h-full flex flex-col justify-center' : '')}
      >
        <div
          className={cn(
            'relative flex items-start w-full',
            isMobile && 'mobile-chat-input' // Apply mobile chat input styling
          )}
        >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
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
              'resize-none w-full min-h-12 rounded-fill border border-input pl-4 pr-30 pt-3 pb-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', // Base pr-20 to pr-30
              isMobile
                ? 'mobile-chat-input input bg-background' // Use mobile input styles
                : 'bg-muted pr-30' // Desktop pr-20 to pr-30
            )}
            onChange={e => {
              setInput(e.target.value)
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
          />
          <Button
            type="button"
            variant={'ghost'}
            size={'icon'}
            className={cn(
              'absolute top-1/2 transform -translate-y-1/2',
              isMobile ? 'right-8' : 'right-10' // Paperclip button
            )}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
          >
            <Paperclip size={isMobile ? 18 : 20} />
          </Button>
          {mapData.attachedImage && (
            <Button
              type="button"
              variant={'ghost'}
              size={'icon'}
              className={cn(
                'absolute top-1/2 transform -translate-y-1/2',
                isMobile ? 'right-16' : 'right-18' // XCircle button, to the left of Paperclip
              )}
              onClick={removeAttachedImage}
              title="Remove attached image"
            >
              <XCircle size={isMobile ? 18 : 20} className="text-red-500" />
            </Button>
          )}
          <Button
            type="submit"
            size={'icon'}
            variant={'ghost'}
            className={cn(
              'absolute top-1/2 transform -translate-y-1/2',
              isMobile ? 'right-1' : 'right-2' // Send button
            )}
            disabled={input.length === 0}
            title="Send message"
          >
            <ArrowRight size={isMobile ? 18 : 20} />
          </Button>
        </div>
      </form>
    </div>
  )
}
