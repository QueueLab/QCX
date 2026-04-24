import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { ChatProvider } from '@/components/chat-provider';
import { getChat, getChatMessages } from '@/lib/actions/chat';
import { MapDataProvider } from '@/components/map/map-data-context';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import type { Message } from 'ai/react';
import type { Message as DrizzleMessage } from '@/lib/actions/chat-db';

export const maxDuration = 60;

export interface SearchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SearchPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserIdOnServer();
  const chat = await getChat(id, userId || 'anonymous');
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

  const chat = await getChat(id, userId);

  if (!chat) {
    notFound();
  }

  const dbMessages: DrizzleMessage[] = await getChatMessages(chat.id);

  const initialMessages: Message[] = dbMessages.map((dbMsg): Message => ({
    id: dbMsg.id,
    role: dbMsg.role as Message['role'],
    content: dbMsg.content,
    createdAt: dbMsg.createdAt ? new Date(dbMsg.createdAt) : undefined,
  }));

  return (
    <ChatProvider chatId={chat.id} initialMessages={initialMessages}>
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </ChatProvider>
  );
}
