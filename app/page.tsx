import { Chat } from '@/components/chat'
import {nanoid } from 'nanoid'

export const maxDuration = 60

import { MapDataProvider } from '@/components/map/map-data-context'

export default function Page() {
  const id = nanoid()
  return (
    <MapDataProvider>
      <Chat id={id} />
    </MapDataProvider>
  )
}
