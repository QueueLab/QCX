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

// Helper function to convert File to Data URL on the client side
async function convertFileToDataURLClient(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error); // Error will be caught by handleSubmit
    reader.readAsDataURL(file);
  });
}

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
  const fileInputRef = useRef<HTMLInputElement>(null) // Added fileInputRef
  const [selectedFile, setSelectedFile] = useState<File | null>(null) // Added selectedFile state
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
    const originalInput = input; // Save original input in case of error

    if (isButtonPressed) {
      handleClear() // This already resets selectedFile
      setIsButtonPressed(false)
    }

    let imageDataUrl: string | null = null;
    let imageContentType: string | null = null;

    if (selectedFile) {
      try {
        imageDataUrl = await convertFileToDataURLClient(selectedFile);
        imageContentType = selectedFile.type;
        console.log('Image converted to data URL on client:', { dataUrlLength: imageDataUrl.length, type: imageContentType });
      } catch (error) {
        console.error('Client-side image conversion error:', error);
        alert('Error processing image on client. Please try again.');
        // Optionally restore input if it was cleared or modified prematurely
        // setInput(originalInput); 
        return; // Stop submission
      }
    }

    // Add user message to UI state
    // Pass imageDataUrl to UserMessage if you want to display it immediately (optimistic update)
    // For now, UserMessage will get it from aiState after server processing if actions.tsx is set up for that.
    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        // If UserMessage is updated to take imageDataUrl directly for optimistic UI:
        // component: <UserMessage message={input} imageUrl={imageDataUrl} /> 
        component: <UserMessage message={input} />
      }
    ])

    const formData = new FormData(e.currentTarget); // e.currentTarget still contains original 'input' field value
    // Do NOT append selectedFile (File object) anymore.
    // Append data URL and content type if available.
    if (imageDataUrl && imageContentType) {
      formData.append('image_attachment_data_url', imageDataUrl);
      formData.append('image_attachment_content_type', imageContentType);
    }
    
    const responseMessage = await submit(formData);
    setMessages(currentMessages => [...currentMessages, responseMessage as any]);
    setSelectedFile(null); // Reset selectedFile after successful submission
    // Input is already managed by setInput, no need to reset here unless it was cleared for submission
  }

  const handleClear = () => {
    router.push('/')
    setSelectedFile(null) // Reset selectedFile when clearing
    setInput('') // Also clear text input
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        console.log('Selected file:', { 
          name: file.name, 
          size: file.size, 
          type: file.type 
        });

        // Optional: Check file type (client-side validation)
        if (!file.type.startsWith('image/')) {
          console.warn('Selected file is not an image type:', file.type);
          // alert('Please select an image file.');
          // setSelectedFile(null);
          // event.target.value = ''; // Reset file input
          // return;
        }

        // Optional: Check file size (client-side validation)
        // const MAX_FILE_SIZE_MB = 5; // Example: 5MB
        // if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        //   console.warn(`File size exceeds ${MAX_FILE_SIZE_MB}MB:`, file.size);
        //   alert(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
        //   setSelectedFile(null);
        //   event.target.value = ''; // Reset file input
        //   return;
        // }

        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Error in handleFileChange:', error);
      // alert('An error occurred while selecting the file.');
      // setSelectedFile(null);
      // event.target.value = ''; // Reset file input
    }
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

  return (
    <div
      className={cn(
        'flex flex-col items-start',
        isMobile
          ? 'w-full'
          : 'sticky bottom-0 bg-background z-10 w-full border-t border-border px-2 py-3 md:px-4'
      )}
    >
      <form
        onSubmit={handleSubmit}
        className={cn('max-w-full w-full', isMobile ? 'px-2 pb-2 pt-1' : '')}
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
            onChange={handleFileChange}
            style={{ display: 'none' }}
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
            onClick={() => fileInputRef.current?.click()} // Trigger file input click
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
