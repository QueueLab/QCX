'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ChatShare } from './chat-share'
import { useActions, useUIState } from 'ai/rsc'
import { AI } from '@/app/actions'
import { useSettingsStore } from '@/lib/store/settings'
import { Button } from './ui/button'
import { Edit3, Trash2, Check, X } from 'lucide-react'
import Textarea from 'react-textarea-autosize'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from './ui/alert-dialog'

type UserMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string } // data URL

type UserMessageProps = {
  id?: string
  content: string | UserMessageContentPart[]
  chatId?: string
  showShare?: boolean
}

export const UserMessage: React.FC<UserMessageProps> = ({
  id,
  content,
  chatId,
  showShare = false
}) => {
  const enableShare = process.env.ENABLE_SHARE === 'true'
  const { resubmit, deleteMessageAction } = useActions()
  const [, setMessages] = useUIState<typeof AI>()

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  // Normalize content to an array
  const contentArray =
    typeof content === 'string' ? [{ type: 'text', text: content }] : content

  // Extract text and image parts
  const textPart = contentArray.find(
    (part): part is { type: 'text'; text: string } => part.type === 'text'
  )?.text
  const imagePart = contentArray.find(
    (part): part is { type: 'image'; image: string } => part.type === 'image'
  )?.image

  const handleEdit = () => {
    setEditContent(textPart || '')
    setIsEditing(true)
  }

  const { mapProvider } = useSettingsStore()

  const handleSave = async () => {
    if (!id || !editContent.trim()) return

    setIsEditing(false)

    // Truncate UI state
    setMessages(currentMessages => {
      const index = currentMessages.findIndex(m => m.id === id)
      return currentMessages.slice(0, index + 1)
    })

    const response = await resubmit(id, editContent, mapProvider)
    setMessages(currentMessages => [...currentMessages, response])
  }

  const handleDelete = async () => {
    if (!id) return

    // Truncate UI state
    setMessages(currentMessages => {
      const index = currentMessages.findIndex(m => m.id === id)
      return currentMessages.slice(0, index)
    })

    await deleteMessageAction(id)
  }

  return (
    <div className="group flex items-start w-full space-x-3 mt-2">
      <div className="flex-1 space-y-2">
        {imagePart && (
          <div className="p-2 border rounded-lg bg-muted w-fit">
            <Image
              src={imagePart}
              alt="attachment"
              width={300}
              height={300}
              className="max-w-xs max-h-64 rounded-md object-contain"
            />
          </div>
        )}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              className="w-full p-2 text-xl break-words bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              autoFocus
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          textPart && <div className="text-xl break-words">{textPart}</div>
        )}
      </div>

      <div className="flex items-center space-x-1">
        {!isEditing && id && (
          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={handleEdit}>
              <Edit3 className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete this message and all subsequent messages in this chat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {enableShare && showShare && chatId && <ChatShare chatId={chatId} />}
      </div>
    </div>
  )
}
