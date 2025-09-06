'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { ArrowRight, Plus, Paperclip } from 'lucide-react'
import Textarea from 'react-textarea-autosize'
import { AIMessage } from '@/lib/types'

interface ChatPanelProps {
  messages: AIMessage[]
  input: string
  setInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export function ChatPanel({ messages, input, setInput }: ChatPanelProps) {
  const [isButtonPressed, setIsButtonPressed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Detect mobile layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024)
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

  const handleClear = () => {
    router.push('/')
  }

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
      <div
        className={cn('max-w-full w-full', isMobile ? 'px-2 pb-2 pt-1 h-full flex flex-col justify-center' : '')}
      >
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
            onChange={setInput}
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
          {!isMobile && (
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
          )}
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
      </div>
    </div>
  )
}
