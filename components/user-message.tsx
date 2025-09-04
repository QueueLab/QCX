import React, { useState } from 'react'
import { ChatShare } from './chat-share'
import { Button } from './ui/button'
import { Pencil, Check, X } from 'lucide-react'
import TextareaAutosize from 'react-textarea-autosize'

type UserMessageProps = {
  id: string
  message: string
  chatId?: string
  showShare?: boolean
  onUpdateMessage: (messageId: string, newContent: string) => void
}

export const UserMessage: React.FC<UserMessageProps> = ({
  id,
  message,
  chatId,
  showShare = false,
  onUpdateMessage
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message)
  const enableShare = process.env.ENABLE_SHARE === 'true'

  const handleEditClick = () => {
    setIsEditing(true)
  }

  const handleSaveClick = () => {
    onUpdateMessage(id, editedMessage)
    setIsEditing(false)
  }

  const handleCancelClick = () => {
    setEditedMessage(message)
    setIsEditing(false)
  }

  return (
    <div className="group relative flex items-start w-full space-x-2 mt-2 min-h-10">
      {isEditing ? (
        <div className="flex flex-col w-full">
          <TextareaAutosize
            value={editedMessage}
            onChange={e => setEditedMessage(e.target.value)}
            className="w-full text-xl bg-transparent resize-none focus:outline-none"
            autoFocus
          />
          <div className="flex justify-end space-x-2 mt-2">
            <Button size="icon" variant="ghost" onClick={handleSaveClick}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancelClick}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xl flex-1 break-words">{message}</div>
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" onClick={handleEditClick}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          {enableShare && showShare && chatId && <ChatShare chatId={chatId} />}
        </>
      )}
    </div>
  )
}
