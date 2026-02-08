import { Chat } from '@/components/chat'
import {nanoid } from '@/lib/utils/nanoid'
import { AI } from './actions'

export const maxDuration = 60

import { MapDataProvider } from '@/components/map/map-data-context'

export default function Page() {
  const id = nanoid()
  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  )
}
