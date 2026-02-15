'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Button } from './ui/button'
import { useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/app/actions'
import { UserMessage } from './user-message'
import { ArrowRight, Paperclip, X } from 'lucide-react'
import { useMapData } from './map/map-data-context'
import { nanoid, cn } from '@/lib/utils'
import Textarea from 'react-textarea-autosize'

export function FollowupPanel() {
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { submit } = useActions()
  const [, setMessages] = useUIState<typeof AI>()
  const { mapData } = useMapData()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!input.trim() && !selectedFile) {
      return
    }

    const content: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = []
    if (input) {
      content.push({ type: 'text', text: input })
    }
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      content.push({
        type: 'image',
        image: URL.createObjectURL(selectedFile)
      })
    }

    const userMessage = {
      id: nanoid(),
      isGenerating: false,
      component: <UserMessage content={content.length > 0 ? content : input} />
    }

    const formData = new FormData()
    formData.append('input', input)
    if (selectedFile) {
      formData.append('file', selectedFile)
    }
    formData.append('drawnFeatures', JSON.stringify(mapData.drawnFeatures || []))

    setInput('')
    clearAttachment()

    const responseMessage = await submit(formData)
    setMessages(currentMessages => [
      ...currentMessages,
      userMessage,
      responseMessage
    ])
  }

  return (
    <div className="flex flex-col w-full">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-start w-full"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="text/plain,image/png,image/jpeg,image/webp"
        />
        <Button
          type="button"
          variant={'ghost'}
          size={'icon'}
          className="absolute left-3 top-1/2 transform -translate-y-1/2"
          onClick={handleAttachmentClick}
          data-testid="followup-attachment-button"
        >
          <Paperclip size={20} />
        </Button>
        <Textarea
          name="input"
          rows={1}
          maxRows={5}
          tabIndex={0}
          placeholder="Explore"
          spellCheck={false}
          value={input}
          data-testid="followup-input"
          className={cn(
            'resize-none w-full min-h-12 rounded-fill border border-input pl-14 pr-14 pt-3 pb-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-muted'
          )}
          onChange={e => setInput(e.target.value)}
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
              const form = e.currentTarget.form
              if (form) {
                form.requestSubmit()
              }
            }
          }}
        />
        <Button
          type="submit"
          size={'icon'}
          disabled={input.length === 0 && !selectedFile}
          variant={'ghost'}
          data-testid="followup-submit"
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          <ArrowRight size={20} />
        </Button>
      </form>
      {selectedFile && (
        <div className="w-full mt-2">
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground truncate max-w-xs">
              {selectedFile.name}
            </span>
            <Button variant="ghost" size="icon" onClick={clearAttachment} data-testid="followup-clear-attachment-button">
              <X size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
