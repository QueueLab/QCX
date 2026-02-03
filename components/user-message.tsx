'use client'

import React from 'react'
import Image from 'next/image'
import { ChatShare } from './chat-share'
import { Button } from './ui/button'
import { MapPin } from 'lucide-react'
import { useMap } from './map/map-context'
import { useMapData } from './map/map-data-context'
import { useMapToggle, MapToggleEnum } from './map-toggle-context'
import { nanoid } from 'nanoid'

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
  const { map } = useMap()
  const { setMapData } = useMapData()
  const { setMapType } = useMapToggle()
  const enableShare = process.env.ENABLE_SHARE === 'true'

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

  const handlePlaceOnMap = () => {
    if (!map || !imagePart) return

    const bounds = map.getBounds()
    if (!bounds) return
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()

    const latStep = (north - south) / 4
    const lngStep = (east - west) / 4

    const nw: [number, number] = [west + lngStep, north - latStep]
    const ne: [number, number] = [east - lngStep, north - latStep]
    const se: [number, number] = [east - lngStep, south + latStep]
    const sw: [number, number] = [west + lngStep, south + latStep]

    const newOverlay = {
      id: nanoid(),
      url: imagePart,
      coordinates: [nw, ne, se, sw] as [[number, number], [number, number], [number, number], [number, number]],
      opacity: 0.7
    }

    setMapData(prev => ({
      ...prev,
      imageOverlays: [...(prev.imageOverlays || []), newOverlay]
    }))

    setMapType(MapToggleEnum.DrawingMode)
  }

  return (
    <div className="flex items-start w-full space-x-3 mt-2">
      <div className="flex-1 space-y-2">
        {imagePart && (
          <div className="group relative p-2 border rounded-lg bg-muted w-fit">
            <Image
              src={imagePart}
              alt="attachment"
              width={300}
              height={300}
              className="max-w-xs max-h-64 rounded-md object-contain"
            />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2 shadow-md"
                onClick={handlePlaceOnMap}
              >
                <MapPin size={14} className="mr-1" />
                Place on Map
              </Button>
            </div>
          </div>
        )}
        {textPart && <div className="text-xl break-words">{textPart}</div>}
      </div>
      {enableShare && showShare && chatId && <ChatShare chatId={chatId} />}
    </div>
  )
}
