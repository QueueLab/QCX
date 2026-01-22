import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getChat, getChatMessages } from '@/lib/actions/chat'; // Added getChatMessages
import { MapDataProvider } from '@/components/map/map-data-context';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'; // For server-side auth
import type { AIMessage } from '@/lib/types'; // For AIMessage type
import type { Message as DrizzleMessage } from '@/lib/actions/chat-db'; // For DrizzleMessage type

export const maxDuration = 60;

export interface SearchPageProps {
  params: Promise<{ id: string }>; // Keep as is for now
}

export async function generateMetadata({ params }: SearchPageProps) {
  const { id } = await params; // Keep as is for now
  const userId = await getCurrentUserIdOnServer(); // Attempt to get user for metadata
  const chat = await getChat(id, userId || 'anonymous'); // Pass userId or 'anonymous' if none
  return {
    title: chat?.title?.toString().slice(0, 50) || 'Search',
  };
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { id } = await params; // Keep as is for now
  const userId = await getCurrentUserIdOnServer();

  if (!userId) {
    redirect('/');
  }

  const chat = await getChat(id, userId);

  if (!chat) {
    notFound();
  }

  // Fetch messages for the chat
  const dbMessages: DrizzleMessage[] = await getChatMessages(chat.id);

  // Transform DrizzleMessages to AIMessages
  const initialMessages: AIMessage[] = dbMessages.map((dbMsg): AIMessage => {
    return {
      id: dbMsg.id,
      role: dbMsg.role as AIMessage['role'],
      content: dbMsg.content,
      createdAt: dbMsg.createdAt ? new Date(dbMsg.createdAt) : undefined,
    };
  });

  return (
    <MapDataProvider>
      <Chat id={id} initialMessages={initialMessages} />
    </MapDataProvider>
  );
}
