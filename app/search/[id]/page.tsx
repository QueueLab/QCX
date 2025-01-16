import { notFound, redirect } from 'next/navigation'
import { Chat } from '@/components/chat'
import { getChat } from '@/lib/actions/chat'
import { AI } from '@/app/actions'



export const maxDuration = 60




export interface SearchPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: SearchPageProps) {
  const chat = await getChat((await params).id, 'anonymous')
  return {
    title: chat?.title.toString().slice(0, 50) || 'Search'
  }
}

export default async function SearchPage({ params }: SearchPageProps) {
 /* if (!isAuthenticated) {
    redirect('/auth')
  }
*/

  //replace with supabase user ID
  const userId = 'anonymous'
  const chat = await getChat((await params).id, userId)

  if (!chat) {
    redirect('/')
  }

  if (chat?.userId !== userId) {
    notFound()
  }

  return (
    <AI
      initialAIState={{
        chatId: chat.id,
        messages: chat.messages
      }}
    >
      <Chat id={(await params).id} />
    </AI>
  )
}
