'use client'

import { useEffect, useState, useRef, ChangeEvent, forwardRef, useImperativeHandle, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { ArrowRight, Paperclip, X } from 'lucide-react'
import Textarea from 'react-textarea-autosize'
import { useSettingsStore } from '@/lib/store/settings'
import { PartialRelated } from '@/lib/schema/related'
import { getSuggestions } from '@/lib/actions/suggest'
import { useMapData } from './map/map-data-context'

interface ChatPanelProps {
  messages: any[]
  input: string
  setInput: (value: string) => void
  onSuggestionsChange?: (suggestions: PartialRelated | null) => void
}

export interface ChatPanelRef {
  handleAttachmentClick: () => void
  submitForm: () => void
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(({ messages, input, setInput, onSuggestionsChange }, ref) => {
  const { mapProvider } = useSettingsStore()
  const [isMobile, setIsMobile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const setSuggestions = useCallback((s: PartialRelated | null) => {
    onSuggestionsChange?.(s)
  }, [onSuggestionsChange])
  const { mapData } = useMapData()
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    handleAttachmentClick() {
      fileInputRef.current?.click()
    },
    submitForm() {
      formRef.current?.requestSubmit()
    }
  }));

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const clearAttachment = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const debouncedGetSuggestions = useCallback(
    (value: string) => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length
      if (wordCount < 2) {
        setSuggestions(null)
        return
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await getSuggestions(value, mapData)
          const reader = response.body?.getReader()
          if (!reader) return
          let result = ''
          while (true) {
            const { done, value: chunk } = await reader.read()
            if (done) break
            result += new TextDecoder().decode(chunk)
            try {
              const lastFullObject = result.lastIndexOf('}')
              if (lastFullObject !== -1) {
                const json = JSON.parse(result.substring(0, lastFullObject + 1))
                setSuggestions(json)
              }
            } catch (e) { }
          }
        } catch (error) { }
      }, 500)
    },
    [mapData, setSuggestions]
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
        ref={formRef}
        className={cn(
          'max-w-full w-full',
          isMobile ? 'px-2 pb-2 pt-1 h-full flex flex-col justify-center' : ''
        )}
      >
        <div
          className={cn(
            'relative flex items-start w-full',
            isMobile && 'mobile-chat-input'
          )}
        >
          <input type="hidden" name="mapProvider" value={mapProvider} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="text/plain,image/png,image/jpeg,image/webp"
          />
          {!isMobile && (
            <Button
              type="button"
              variant={'ghost'}
              size={'icon'}
              className={cn(
                'absolute top-1/2 transform -translate-y-1/2 left-3'
              )}
              onClick={handleAttachmentClick}
              data-testid="desktop-attachment-button"
            >
              <Paperclip size={isMobile ? 18 : 20} />
            </Button>
          )}
          <Textarea
            ref={inputRef}
            name="input"
            rows={1}
            maxRows={isMobile ? 3 : 5}
            tabIndex={0}
            placeholder="Explore"
            spellCheck={false}
            value={input}
            data-testid="chat-input"
            className={cn(
              'resize-none w-full min-h-12 rounded-fill border border-input pl-14 pr-12 pt-3 pb-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              isMobile
                ? 'mobile-chat-input input bg-background'
                : 'bg-muted'
            )}
            onChange={e => {
              setInput(e.target.value)
              debouncedGetSuggestions(e.target.value)
            }}
            onKeyDown={e => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                if (input.trim().length === 0 && !selectedFile) {
                  e.preventDefault()
                  return
                }
                e.preventDefault()
                formRef.current?.requestSubmit()
              }
            }}
          />
          <Button
            type="submit"
            size={'icon'}
            variant={'ghost'}
            className={cn(
              'absolute top-1/2 transform -translate-y-1/2',
              isMobile ? 'right-1' : 'right-2'
            )}
            disabled={input.length === 0 && !selectedFile}
            aria-label="Send message"
            data-testid="chat-submit"
          >
            <ArrowRight size={isMobile ? 18 : 20} />
          </Button>
        </div>
      </form>
      {selectedFile && (
        <div className="w-full px-4 pb-2 mb-2">
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground truncate max-w-xs">
              {selectedFile.name}
            </span>
            <Button variant="ghost" size="icon" onClick={clearAttachment} data-testid="clear-attachment-button">
              <X size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
ChatPanel.displayName = 'ChatPanel'
