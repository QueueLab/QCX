import React from 'react'
import { ChatShare } from './chat-share'

type UserMessageProps = {
  message: string
  chatId?: string
  showShare?: boolean
  imageUrl?: string // Added imageUrl prop
}

export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  chatId,
  showShare = false,
  imageUrl // Destructure imageUrl
}) => {
  const enableShare = process.env.ENABLE_SHARE === 'true'
  return (
    <div className="flex flex-col w-full space-y-1 mt-2"> {/* Changed to flex-col and added space-y-1 */}
      <div className="flex items-center w-full space-x-1 min-h-10">
        <div className="text-xl flex-1 break-words">{message}</div>
        {enableShare && showShare && chatId && <ChatShare chatId={chatId} />}
      </div>
      {imageUrl && ( // Conditionally render image
        <div className="mt-2">
          <img
            src={imageUrl}
            alt="User attachment"
            className="max-w-xs max-h-64 rounded-md border" // Added some basic styling
          />
        </div>
      )}
    </div>
  )
}
