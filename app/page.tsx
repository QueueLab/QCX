import { Chat } from '@/components/chat'
import { nanoid } from 'nanoid'
import { AI } from './actions'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { MapDataProvider } from '@/components/map/map-data-context'
import { redirect } from 'next/navigation'

export default async function Page() {
  const userId = await getCurrentUserIdOnServer()
  
  if (!userId) {
    redirect('/auth')
  }

  const id = nanoid()
  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  )
}
