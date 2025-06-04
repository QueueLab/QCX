import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getChat } from '@/lib/actions/chat';
import { AI } from '@/app/actions';

export const maxDuration = 60;

export interface SearchPageProps {
  params: Promise<{ id: string }>; // Change to Promise
}

export async function generateMetadata({ params }: SearchPageProps) {
  const { id } = await params; // Unwrap the Promise
  const chat = await getChat(id, 'anonymous');
  return {
    title: chat?.title.toString().slice(0, 50) || 'Search',
  };
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { id } = await params; // Unwrap the Promise
  const userId = 'anonymous';
  const chat = await getChat(id, userId);

  if (!chat) {
    redirect('/');
  }

  if (chat?.userId !== userId) {
    notFound();
  }

  return (
    <AI
      key={id}
      initialAIState={{
        chatId: chat.id,
        messages: chat.messages,
      }}
    >
      <Chat id={id} />
    </AI>
  );
}