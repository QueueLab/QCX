'use client'

import { useEffect, useState, useRef, ChangeEvent, forwardRef, useImperativeHandle, useCallback } from 'react'
import type { AI, UIState } from '@/app/actions'
import { useUIState, useActions, readStreamableValue } from 'ai/rsc'
import { useGeospatialModel } from '@/lib/geospatial-model-context'
import { cn } from '@/lib/utils'
import { UserMessage } from './user-message'
import { Button } from './ui/button'
import { ArrowRight, Plus, Paperclip, X } from 'lucide-react'
import Textarea from 'react-textarea-autosize'
import { nanoid } from 'nanoid'
import { useSettingsStore } from '@/lib/store/settings'
import { PartialRelated } from '@/lib/schema/related'
import { getSuggestions } from '@/lib/actions/suggest'
import { useMapData } from './map/map-data-context'
import SuggestionsDropdown from './suggestions-dropdown'

interface ChatPanelProps {
  messages: UIState
  input: string
  setInput: (value: string) => void
  onSuggestionsChange?: (suggestions: PartialRelated | null) => void
}

export interface ChatPanelRef {
  handleAttachmentClick: () => void
  submitForm: () => void
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(({ messages, input, setInput, onSuggestionsChange }, ref) => {
  const [, setMessages] = useUIState<typeof AI>()
  const { submit, clearChat } = useActions()
  const { isGeospatialModelEnabled } = useGeospatialModel();
  const { mapProvider } = useSettingsStore()
  const [isMobile, setIsMobile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [suggestions, setSuggestionsState] = useState<PartialRelated | null>(null)
  const setSuggestions = useCallback((s: PartialRelated | null) => {
    setSuggestionsState(s)
    onSuggestionsChange?.(s)
  }, [onSuggestionsChange, setSuggestionsState])
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const trimmedInput = input.trim();
    if (!trimmedInput && !selectedFile) {
      return; // Prevent submission if both text and file are empty
    }

    if (isGeospatialModelEnabled) {
      // Logic for Geospatial Model (ONNX)
      const userMessageContent: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [];
      if (trimmedInput) {
        userMessageContent.push({ type: 'text', text: `[ONNX Request]: ${trimmedInput}` });
      }
      if (selectedFile) {
        userMessageContent.push({ type: 'image', image: URL.createObjectURL(selectedFile) });
      }

      setMessages(currentMessages => [
        ...currentMessages,
        { id: nanoid(), component: <UserMessage content={userMessageContent} /> }
      ]);

      const onnxFormData = new FormData();
      if (trimmedInput) {
        onnxFormData.append('query', trimmedInput);
      }
      if (selectedFile) {
        onnxFormData.append('file', selectedFile);
      }

      setInput('');
      clearAttachment();

      try {
        const response = await fetch('/api/onnx', {
          method: 'POST',
          body: onnxFormData,
        });

        if (!response.ok) {
          throw new Error(`ONNX API request failed with status ${response.status}`);
        }

        const data = await response.json();

        // Validate the response shape
        if (typeof data !== 'object' || data === null || !data.prediction) {
          console.error("Unexpected response format from ONNX API:", data);
          throw new Error('Unexpected response format from the ONNX model.');
        }

        const predictionText = typeof data.prediction === 'string' ? data.prediction : JSON.stringify(data.prediction, null, 2);

        setMessages(currentMessages => [
          ...currentMessages,
          {
            id: nanoid(),
            component: (
              <div className="p-4 my-2 border rounded-lg bg-muted">
                <p><strong>ONNX Model Response:</strong></p>
                <pre className="whitespace-pre-wrap">{predictionText}</pre>
              </div>
            )
          }
        ]);

      } catch (error) {
        console.error('ONNX API call failed:', error);
        setMessages(currentMessages => [
          ...currentMessages,
          {
            id: nanoid(),
            component: (
              <div className="p-4 my-2 border rounded-lg bg-destructive/20 text-destructive">
                <p><strong>Error:</strong> {error instanceof Error ? error.message : 'Failed to get ONNX model response.'}</p>
              </div>
            )
          }
        ]);
      }
    } else {
      // Default chat submission logic
      const defaultContent: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [];
      if (trimmedInput) {
        defaultContent.push({ type: 'text', text: trimmedInput });
      }
      if (selectedFile) {
        defaultContent.push({ type: 'image', image: URL.createObjectURL(selectedFile) });
      }

      setMessages(currentMessages => [
        ...currentMessages,
        { id: nanoid(), component: <UserMessage content={defaultContent} /> }
      ]);

      const defaultFormData = new FormData(e.currentTarget);
      if (selectedFile) {
        defaultFormData.append('file', selectedFile);
      }
      
      // Include drawn features in the form data
      defaultFormData.append('drawnFeatures', JSON.stringify(mapData.drawnFeatures || []))

      setInput('');
      clearAttachment();

      const responseMessage = await submit(defaultFormData);
      setMessages(currentMessages => [...currentMessages, responseMessage as any]);
    }
  }

  const handleClear = async () => {
    setMessages([])
    clearAttachment()
    await clearChat()
  }

  const debouncedGetSuggestions = useCallback(
    (value: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      const wordCount = value.trim().split(/\s+/).filter(Boolean).length
      if (wordCount < 2) {
        setSuggestions(null)
        return
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        const suggestionsStream = await getSuggestions(value, mapData)
        for await (const partialSuggestions of readStreamableValue(
          suggestionsStream
        )) {
          if (partialSuggestions) {
            setSuggestions(partialSuggestions as PartialRelated)
          }
        }
      }, 500) // 500ms debounce delay
    },
    [mapData, setSuggestions]
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  if (messages.length > 0 && !isMobile) {
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
          data-testid="new-chat-button"
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
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn(
          'max-w-full w-full',
          isMobile ? 'px-2 pb-2 pt-1 h-full flex flex-col justify-center' : ''
        )}
      >
        <div
          className={cn(
            'relative flex items-start w-full',
            isMobile && 'mobile-chat-input' // Apply mobile chat input styling
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
