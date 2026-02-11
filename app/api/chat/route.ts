import { getModel } from '@/lib/utils'
import { LanguageModel, streamText } from 'ai'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages } = await req.json()
  const userId = await getCurrentUserIdOnServer()
  const guestChatEnabled = process.env.ENABLE_GUEST_CHAT === 'true'

  if (!userId && !guestChatEnabled) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await streamText({
    model: (await getModel()) as LanguageModel,
    messages,
  })

  return result.toDataStreamResponse()
}
