import { Chat } from '@/components/chat'
import {nanoid } from 'nanoid'
import { AI } from './actions'

export const maxDuration = 60

import { MapDataProvider } from '@/components/map/map-data-context'

export default function Page() {
  const id = nanoid()
  const initialAIState = {
    conversations: [
      {
        id: nanoid(),
        chatId: id,
        messages: []
      }
    ]
  }
  return (
    <AI initialAIState={initialAIState}>
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  )
}
