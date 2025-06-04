import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { getChat } from '@/lib/actions/chat';
import { AI } from '@/app/actions';
import { type AIMessage } from '@/lib/types';

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

// Helper type guards
function isAIMessage(obj: any): obj is AIMessage {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.role === 'string' &&
    typeof obj.content === 'string' &&
    // Optional: Add checks for other mandatory fields if strict validation is needed
    (obj.type === undefined || typeof obj.type === 'string') &&
    (obj.name === undefined || typeof obj.name === 'string')
  );
}

function isAIMessageArray(obj: any): obj is AIMessage[] {
  return Array.isArray(obj) && obj.every(isAIMessage);
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { id } = await params; // Unwrap the Promise
  const userId = 'anonymous';
  const chat = await getChat(id, userId);

  if (!chat) {
    redirect('/');
  }

  if (chat.userId !== userId) {
    notFound();
  }

  let parsedMessages: AIMessage[];

  // Check if chat.messages exists and is a string before trying to parse
  if (chat.messages && typeof chat.messages === 'string') {
    try {
      const parsedJson = JSON.parse(chat.messages);
      if (isAIMessageArray(parsedJson)) {
        parsedMessages = parsedJson;
      } else {
        console.warn('Parsed chat.messages is not a valid AIMessage array.');
        parsedMessages = [];
      }
    } catch (error) {
      console.error('Failed to parse chat.messages from string:', error);
      parsedMessages = []; // Fallback to empty array on error
    }
  } else if (Array.isArray(chat.messages)) {
    parsedMessages = chat.messages; // Assume it's already an array
  } else {
    // Handle cases where chat.messages is neither a string nor an array (e.g., null, undefined)
    console.warn('chat.messages is not a string or array, defaulting to empty array.');
    parsedMessages = [];
  }

  return (
    <AI
      key={id}
      initialAIState={{
        chatId: chat.id,
        messages: parsedMessages, // Use the correctly typed parsedMessages
      }}
    >
      <Chat id={id} />
    </AI>
  );
}