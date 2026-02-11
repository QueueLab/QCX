import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getChat, getChatMessages } from '@/lib/actions/chat';
import { AI } from '@/app/actions';
import { MapDataProvider } from '@/components/map/map-data-context';
import { getSupabaseUserAndSessionOnServer } from '@/lib/auth/get-current-user';
import { ensureUserExists } from '@/lib/actions/users';
import type { AIMessage } from '@/lib/types';

export const maxDuration = 60;

export interface SearchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SearchPageProps) {
  const { id } = await params;
  const { user } = await getSupabaseUserAndSessionOnServer();
  const chat = await getChat(id, user?.id);
  return {
    title: chat?.title?.toString().slice(0, 50) || 'Search',
  };
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { id } = await params;
  const { user } = await getSupabaseUserAndSessionOnServer();
  const guestChatEnabled = process.env.ENABLE_GUEST_CHAT === 'true';

  if (!user && !guestChatEnabled) {
    redirect('/');
  }

  // Ensure user exists if authenticated
  if (user) {
    await ensureUserExists(user.id, user.email);
  }

  const chat = await getChat(id, user?.id);

  if (!chat) {
    notFound();
  }

  const initialMessages = await getChatMessages(chat.id);

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
