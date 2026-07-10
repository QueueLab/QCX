import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getChat, getChatMessages } from '@/lib/actions/chat'; // Added getChatMessages
import { AI } from '@/app/actions';
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
  // TODO: Metadata generation might need authenticated user if chats are private
  // For now, assuming getChat can be called or it handles anon access for metadata appropriately
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
    // If no user, redirect to login or show appropriate page
    // For now, redirecting to home, but a login page would be better.
    redirect('/');
  }

  const chat = await getChat(id, userId);

  if (!chat) {
    // If chat doesn't exist or user doesn't have access (handled by getChat)
    notFound();
  }

  // Fetch messages for the chat
  const dbMessages: DrizzleMessage[] = await getChatMessages(chat.id);

  // Transform DrizzleMessages to AIMessages — restore persisted type and name
  const initialMessages: AIMessage[] = dbMessages.map((dbMsg): AIMessage => {
    const dbMsgWithMeta = dbMsg as DrizzleMessage & { messageType: string | null; messageName: string | null };
    // Validate the messageType against the known AIMessage['type'] values
    const validTypes: AIMessage['type'][] = [
      'response', 'related', 'skip', 'inquiry', 'input',
      'input_related', 'tool', 'followup', 'end', 'drawing_context',
      'resolution_search_result', 'definition'
    ];
    const safeType = (dbMsgWithMeta.messageType && validTypes.includes(dbMsgWithMeta.messageType as AIMessage['type']))
      ? (dbMsgWithMeta.messageType as AIMessage['type'])
      : undefined;
    return {
      id: dbMsg.id,
      role: dbMsg.role as AIMessage['role'],
      content: dbMsg.content,
      type: safeType,
      name: dbMsgWithMeta.messageName || undefined,
      createdAt: dbMsg.createdAt ? new Date(dbMsg.createdAt) : undefined,
    };
  });

  return (
    <AI
      initialAIState={{
        chatId: chat.id,
        messages: initialMessages, // Use the transformed messages from the database
        // isSharePage: true, // This was in PR#533, but share functionality is removed.
                             // If needed for styling or other logic, it can be set.
      }}
    >
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  );
}