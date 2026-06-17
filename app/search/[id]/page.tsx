import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getChat, getChatMessages } from '@/lib/actions/chat';
import { AI } from '@/app/actions';
import { MapDataProvider } from '@/components/map/map-data-context';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import type { AIMessage } from '@/lib/types';
import type { Message as DrizzleMessage } from '@/lib/actions/chat-db';

export const maxDuration = 60;

export interface SearchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SearchPageProps) {
  const { id } = await params;
  const chat = await getChat(id);
  return {
    title: chat?.title?.toString().slice(0, 50) || 'Search',
  };
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserIdOnServer();

  if (!userId) {
    redirect('/');
  }

  const chat = await getChat(id);

  if (!chat) {
    notFound();
  }

  const dbMessages: DrizzleMessage[] = await getChatMessages(chat.id);

  const initialMessages: AIMessage[] = dbMessages.map((dbMsg): AIMessage => {
    return {
      id: dbMsg.id,
      role: dbMsg.role as AIMessage['role'],
      content: dbMsg.content,
      createdAt: dbMsg.createdAt ? new Date(dbMsg.createdAt) : undefined,
    };
  });

  return (
    <AI
      initialAIState={{
        chatId: chat.id,
        messages: initialMessages,
      }}
    >
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  );
}
