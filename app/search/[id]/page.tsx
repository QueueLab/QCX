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
  // getChat will handle authenticated or anonymous access via session
  const chat = await getChat(id);
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

  const chat = await getChat(id);

  if (!chat) {
    // If chat doesn't exist or user doesn't have access (handled by getChat)
    notFound();
  }

  // Fetch messages for the chat (verified by getChatMessages)
  const dbMessages: DrizzleMessage[] = await getChatMessages(chat.id);

  // Transform DrizzleMessages to AIMessages
  const initialMessages: AIMessage[] = dbMessages.map((dbMsg): AIMessage => {
    return {
      id: dbMsg.id,
      role: dbMsg.role as AIMessage['role'], // Cast role, ensure AIMessage['role'] includes all dbMsg.role possibilities
      content: dbMsg.content,
      createdAt: dbMsg.createdAt ? new Date(dbMsg.createdAt) : undefined,
      // 'type' and 'name' are not in the basic Drizzle 'messages' schema.
      // These would be undefined unless specific logic is added to derive them.
      // For instance, if a message with role 'tool' should have a 'name',
      // or if some messages have a specific 'type' based on content or other flags.
      // This mapping assumes standard user/assistant messages primarily.
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