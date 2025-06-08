'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AI, UIState } from '@/app/actions'
import { useMapData } from './map/map-data-context' // Corrected path
import { useUIState, useActions } from 'ai/rsc'
import { cn, getModel } from '@/lib/utils' // Added getModel
import { UserMessage } from './user-message'
import { Button } from './ui/button'
import { ArrowRight, Plus, Paperclip, XCircle } from 'lucide-react' // Added XCircle
import Textarea from 'react-textarea-autosize'
import { nanoid } from 'nanoid'
import { CoreMessage, generateText } from 'ai' // AI SDK imports
import { Spinner } from './ui/spinner' // Spinner import

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
  const [isProcessingImage, setIsProcessingImage] = useState(false); // Loading state for AI processing
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return;

    setIsProcessingImage(true);
    // Clear previous error messages
    setMapData(prev => ({ ...prev, error: null, imageBoundingBox: null }));


    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageDataUrl = reader.result as string;
      try {
        await getMapInfoFromImage(imageDataUrl);
      } catch (error) {
        console.error("Error processing image:", error);
        setMapData(prev => ({
          ...prev,
          attachedImage: imageDataUrl, // Keep the image even if processing fails
          imageBoundingBox: null,
          error: 'Failed to analyze image with AI.'
        }));
      } finally {
        setIsProcessingImage(false);
        // Reset file input value to allow selecting the same file again
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const getMapInfoFromImage = async (imageDataUrl: string) => {
    const model = getModel();
    const messages: CoreMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: "Analyze this image. Is it primarily a map? If yes, provide a JSON object with two keys: 'isMap' (boolean) and 'boundingBox'. The 'boundingBox' should define the geographical area of the map with 'northEast' and 'southWest' latitude/longitude coordinates. If it's not a map or you cannot determine the bounding box, set 'isMap' to false and omit 'boundingBox'. Example for a map: {\\"isMap\\": true, \\"boundingBox\\": {\\"northEast\\": {\\"lat\\": 40.785, \\"lon\\": -73.960}, \\"southWest\\": {\\"lat\\": 40.768, \\"lon\\": -73.982}}}"
          },
          {
            type: 'image',
            image: new URL(imageDataUrl)
          }
        ]
      }
    ];

    try {
      const { text } = await generateText({ model, messages });
      console.log("AI Response Text:", text);

      let parsedData;
      let isMap = false;
      let boundingBox = null;
      let parseError = null;

      try {
        parsedData = JSON.parse(text);
        if (parsedData && typeof parsedData.isMap === 'boolean') {
          isMap = parsedData.isMap;
          if (isMap && parsedData.boundingBox) {
            // Basic validation for boundingBox structure (can be more thorough)
            if (parsedData.boundingBox.northEast && parsedData.boundingBox.southWest &&
                typeof parsedData.boundingBox.northEast.lat === 'number' &&
                typeof parsedData.boundingBox.northEast.lon === 'number' &&
                typeof parsedData.boundingBox.southWest.lat === 'number' &&
                typeof parsedData.boundingBox.southWest.lon === 'number') {
              boundingBox = parsedData.boundingBox;
            } else {
              parseError = 'Invalid boundingBox structure received from AI.';
              isMap = false; // Treat as not a map if bbox is invalid
            }
          } else if (isMap && !parsedData.boundingBox) {
            // isMap is true but no boundingBox
            parseError = 'AI indicated it is a map but did not provide a bounding box.';
            isMap = false; // Treat as not a map if bbox is missing
          }
        } else {
          parseError = 'AI response did not include a valid isMap boolean.';
        }
      } catch (e) {
        console.error("Error parsing AI response JSON:", e);
        parseError = "Could not parse AI response. Is it valid JSON?";
      }

      console.log("Parsed AI Data:", { isMap, boundingBox, parseError });

      if (isMap && boundingBox) {
        setMapData(prev => ({
          ...prev,
          attachedImage: imageDataUrl,
          imageBoundingBox: boundingBox, // This field needs to be added to MapData interface
          error: parseError // Store parse error if any, even if bbox is found
        }));
      } else {
        setMapData(prev => ({
          ...prev,
          attachedImage: imageDataUrl,
          imageBoundingBox: null,
          error: parseError || "AI could not determine map coordinates or it's not a map."
        }));
      }
    } catch (modelError) {
      console.error("Error calling AI model:", modelError);
      setMapData(prev => ({
        ...prev,
        attachedImage: imageDataUrl, // Keep image
        imageBoundingBox: null,
        error: 'Error communicating with AI model.'
      }));
    }
  };

  const removeAttachedImage = () => {
    setMapData(prev => ({ ...prev, attachedImage: null, imageBoundingBox: null, error: null }));
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
            onClick={() => !isProcessingImage && fileInputRef.current?.click()}
            disabled={isProcessingImage}
            title="Attach image"
          >
            {isProcessingImage ? <Spinner className="h-5 w-5" /> : <Paperclip size={isMobile ? 18 : 20} />}
          </Button>
          {mapData.attachedImage && !isProcessingImage && ( // Hide remove button during processing
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
            disabled={input.length === 0 || isProcessingImage}
            title="Send message"
          >
            <ArrowRight size={isMobile ? 18 : 20} />
          </Button>
        </div>
        {mapData.error && (
          <div className="mt-2 text-xs text-red-500 text-center w-full">
            {mapData.error}
          </div>
        )}
      </form>
    </div>
  )
}
