import { Chat } from '@/components/chat'
import { nanoid } from '@/lib/utils'
import { ChatProvider } from '@/components/chat-provider'
import { MapDataProvider } from '@/components/map/map-data-context'

export const maxDuration = 60

export default function Page() {
  const id = nanoid()
  return (
    <ChatProvider chatId={id}>
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </ChatProvider>
  )
}
