import { Chat } from '@/components/chat'
import { AI } from './actions'

export const maxDuration = 60

import { MapDataProvider } from '@/components/map/map-data-context'

export default function Page() {
  return (
    <AI initialAIState={{ chatId: 'new-chat', messages: [] }}>
      <MapDataProvider>
        <Chat />
      </MapDataProvider>
    </AI>
  )
}
