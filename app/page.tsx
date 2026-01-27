import { nanoid } from 'nanoid'
import { ChatThreadManager } from '@/components/chat-thread-manager'
import { MapDataProvider } from '@/components/map/map-data-context'
import { AI } from './ai'

export const maxDuration = 60

export default function Page() {
  const id = nanoid()
  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <MapDataProvider>
        <ChatThreadManager initialThread={{ id, initialMessages: [] }} />
      </MapDataProvider>
    </AI>
  )
}
