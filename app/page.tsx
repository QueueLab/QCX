import { Chat } from '@/components/chat'
import {nanoid } from 'nanoid'
import { AI } from './actions'
import { cookies } from 'next/headers'

export const maxDuration = 60

import { MapDataProvider } from '@/components/map/map-data-context'

export default async function Page() {
  const id = nanoid()
  const cookieStore = cookies()
  const userCookie = (await cookieStore).get('copilotkit_user_details')
  const user = userCookie ? JSON.parse(userCookie.value) : {}
  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <MapDataProvider>
        <Chat id={id} user={user} />
      </MapDataProvider>
    </AI>
  )
}
