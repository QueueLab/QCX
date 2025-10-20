import { nanoid } from 'nanoid';
import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getChat, getChatMessages } from '@/lib/actions/chat';
import { AI, AIState } from '@/app/actions';
import { MapDataProvider } from '@/components/map/map-data-context';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import type { AIMessage } from '@/lib/types';
import type { Message as DrizzleMessage } from '@/lib/actions/chat-db';

export const maxDuration = 60;

export interface SearchPageProps {
  params: Promise<{ id: string }>;
}

const validRoles: AIMessage['role'][] = ['user', 'assistant', 'system', 'function', 'data', 'tool'];

function safeGetRole(role: string): AIMessage['role'] {
  if (validRoles.includes(role as AIMessage['role'])) {
    return role as AIMessage['role'];
  }
  console.warn(`Invalid role "${role}" found in database, defaulting to 'user'.`);
  return 'user';
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

  const initialMessages: AIMessage[] = dbMessages.map((dbMsg): AIMessage => {
    return {
      id: dbMsg.id,
      role: safeGetRole(dbMsg.role),
      content: dbMsg.content,
      createdAt: dbMsg.createdAt ? new Date(dbMsg.createdAt) : undefined,
    };
  });

  const initialAIState = {
    conversations: [
      {
        id: nanoid(),
        chatId: chat.id,
        messages: initialMessages,
      }
    ]
  } satisfies AIState;

  return (
    <AI initialAIState={initialAIState}>
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  );
}
