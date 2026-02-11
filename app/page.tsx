import { Chat } from '@/components/chat'
import { nanoid } from '@/lib/utils'
import { AI } from './actions'
import { getCurrentUserIdOnServer, getSupabaseUserAndSessionOnServer } from '@/lib/auth/get-current-user'
import { redirect } from 'next/navigation'
import { MapDataProvider } from '@/components/map/map-data-context'
import { ensureUserExists } from '@/lib/actions/users'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export default async function Page() {
  const { user } = await getSupabaseUserAndSessionOnServer()
  
  if (!user) {
    redirect('/auth')
  }

  // Ensure user exists in public.users table for FK constraints
  await ensureUserExists(user.id, user.email)

  const id = nanoid()
  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  )
}
