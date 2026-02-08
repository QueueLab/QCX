import { notFound } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getSharedChat } from '@/lib/actions/chat';
import { AI } from '@/app/actions';
import { MapDataProvider } from '@/components/map/map-data-context';

export const maxDuration = 60;

export interface SharePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SharePageProps) {
  const { id } = await params;
  const chat = await getSharedChat(id);
  return {
    title: chat?.title?.toString().slice(0, 50) || 'Shared Search',
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const chat = await getSharedChat(id);

  if (!chat) {
    notFound();
  }

  return (
    <AI
      initialAIState={{
        chatId: chat.id,
        messages: chat.messages,
        isSharePage: true
      }}
    >
      <MapDataProvider>
        <Chat id={id} />
      </MapDataProvider>
    </AI>
  );
}
