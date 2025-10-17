import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChatShare } from './chat-share'

type UserMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string | File } // Can be a data URL or a File object

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
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Normalize content to an array
  const contentArray =
    typeof content === 'string' ? [{ type: 'text', text: content }] : content

  // Extract text and image parts
  const textPart = contentArray.find(
    (part): part is { type: 'text'; text: string } => part.type === 'text'
  )?.text
  const imageContent = contentArray.find(
    (part): part is { type: 'image'; image: string | File } =>
      part.type === 'image'
  )?.image

  useEffect(() => {
    let objectUrl: string | null = null

    if (imageContent instanceof File) {
      objectUrl = URL.createObjectURL(imageContent)
      setImageUrl(objectUrl)
    } else if (typeof imageContent === 'string') {
      setImageUrl(imageContent)
    }

    // Cleanup function to revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        setImageUrl(null) // Reset state on cleanup
      }
    }
  }, [imageContent])

  return (
    <div className="flex items-start w-full space-x-3 mt-2">
      <div className="flex-1 space-y-2">
        {imageUrl && (
          <div className="p-2 border rounded-lg bg-muted w-fit">
            <Image
              src={imageUrl}
              alt="attachment"
              width={300}
              height={300}
              className="max-w-xs max-h-64 rounded-md object-contain"
              onLoad={() => {
                // Optional: Revoke URL after image has loaded to free memory sooner
                // if the image is cached by the browser.
                // Note: This might cause issues if the component re-renders and
                // the browser needs to fetch the image again.
                // URL.revokeObjectURL(imageUrl);
              }}
            />
          </div>
        )}
        {textPart && <div className="text-xl break-words">{textPart}</div>}
      </div>
      {enableShare && showShare && chatId && <ChatShare chatId={chatId} />}
    </div>
  )
}
