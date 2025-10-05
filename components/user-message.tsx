import React from 'react'
import Image from 'next/image'
import { ChatShare } from './chat-share'

type UserMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string } // data URL

type UserMessageProps = {
  content: string | UserMessageContentPart[]
  chatId?: string
  showShare?: boolean
}

export const UserMessage: React.FC<UserMessageProps> = ({
  content,
  chatId,
  showShare = false
}) => {
  const enableShare = process.env.ENABLE_SHARE === 'true'

  // Normalize content to an array
  const contentArray =
    typeof content === 'string' ? [{ type: 'text', text: content }] : content

  // Extract text and image parts
  const textPart = contentArray.find(
    (part): part is { type: 'text'; text: string } => part.type === 'text'
  )?.text;
  const imageParts = contentArray.filter(
    (part): part is { type: 'image'; image: string } => part.type === 'image'
  );

  return (
    <div className="flex items-start w-full space-x-3 mt-2">
      <div className="flex-1 space-y-2">
        {imageParts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageParts.map((imagePart, index) => (
              <div key={index} className="p-2 border rounded-lg bg-muted w-fit">
                <Image
                  src={imagePart.image}
                  alt={`attachment ${index + 1}`}
                  width={300}
                  height={300}
                  className="max-w-xs max-h-64 rounded-md object-contain"
                />
              </div>
            ))}
          </div>
        )}
        {textPart && <div className="text-xl break-words">{textPart}</div>}
      </div>
      {enableShare && showShare && chatId && <ChatShare chatId={chatId} />}
    </div>
  )
}
