'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type Chat, type AIMessage } from '@/lib/types'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import {
  getChat as dbGetChat,
  getChatsPage as dbGetChatsPage,
  clearHistory as dbClearHistory,
  saveChat as dbSaveChat,
  createMessage as dbCreateMessage,
  getMessagesByChatId as dbGetMessagesByChatId,
  NewChat as DbNewChat,
  NewMessage as DbNewMessage
} from './chat-db'
import { db } from '@/lib/db'
import { users, chats } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { embedMany, CoreMessage } from 'ai'
import { getEmbeddingModel } from '@/lib/utils'

function extractTextForEmbedding(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n');
  }
  return '';
}

// Using Drizzle versions by default as per main's direction
export async function getChats(userId?: string | null): Promise<Chat[]> {
  try {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      effectiveUserId = await getCurrentUserIdOnServer();
    }
    
    if (!effectiveUserId) {
      console.warn('getChats: No authenticated user found.')
      return []
    }

    const { chats } = await dbGetChatsPage(effectiveUserId, 100, 0)
    return chats as unknown as Chat[]
  } catch (error) {
    console.error('getChats: Unexpected error:', error)
    return []
  }
}

export async function getChat(id: string, userId?: string | null): Promise<Chat | null> {
  try {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      effectiveUserId = await getCurrentUserIdOnServer();
    }

    if (!effectiveUserId) {
      console.warn('getChat: No authenticated user found.')
      return null
    }

    const chat = await dbGetChat(id, effectiveUserId)
    if (!chat) return null

    const messages = await dbGetMessagesByChatId(id)

    return {
      ...chat,
      messages: messages.map(m => ({
        ...m,
        content: typeof m.content === 'string' && (m.content.startsWith('[') || m.content.startsWith('{')) ? JSON.parse(m.content) : m.content
      }))
    } as unknown as Chat
  } catch (error) {
    console.error('getChat: Unexpected error:', error)
    return null
  }
}

export async function getChatMessages(chatId: string): Promise<AIMessage[]> {
  if (!chatId) return []
  try {
    const messages = await dbGetMessagesByChatId(chatId)
    return messages.map(m => ({
        ...m,
        content: typeof m.content === 'string' && (m.content.startsWith('[') || m.content.startsWith('{')) ? JSON.parse(m.content) : m.content
    })) as unknown as AIMessage[]
  } catch (error) {
    console.error('getChatMessages: Unexpected error:', error)
    return []
  }
}

export async function clearChats(userId?: string | null): Promise<{ error?: string } | void> {
  const currentUserId = userId || (await getCurrentUserIdOnServer())
  if (!currentUserId) {
    return { error: 'User ID is required to clear chats' }
  }

  try {
    const success = await dbClearHistory(currentUserId)
    if (!success) {
      return { error: 'Failed to clear chats from database.' }
    }
    revalidatePath('/')
    redirect('/')
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        throw error;
    }
    console.error('clearChats: Unexpected error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function saveChat(chat: Chat, userId: string): Promise<string | null> {
  if (!userId && !chat.userId) {
    console.error('saveChat: userId is required')
    return null
  }
  const effectiveUserId = userId || chat.userId

  const newChatData: DbNewChat = {
    id: chat.id,
    userId: effectiveUserId,
    title: chat.title || 'Untitled Chat',
    createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
    visibility: chat.visibility || 'private',
    updatedAt: new Date(),
  };

  // Prepare messages data
  const messagesWithExtractedText = chat.messages.map(msg => ({
    ...msg,
    extractedText: extractTextForEmbedding(msg.content),
    jsonContent: typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content,
  }));

  const embeddingModel = getEmbeddingModel();
  const processedMessages: DbNewMessage[] = [];

  if (embeddingModel) {
    try {
      // Filter messages that should have embeddings (user and assistant)
      const messagesNeedingEmbeddings = messagesWithExtractedText.filter(m =>
        (m.role === 'user' || m.role === 'assistant') && m.extractedText && m.extractedText.length > 0
      );

      let embeddings: number[][] = [];
      if (messagesNeedingEmbeddings.length > 0) {
        const result = await embedMany({
          model: embeddingModel,
          values: messagesNeedingEmbeddings.map(m => m.extractedText),
        });
        embeddings = result.embeddings;
      }

      // Map embeddings back to messages
      messagesWithExtractedText.forEach(m => {
        const index = messagesNeedingEmbeddings.findIndex(nm => nm.id === m.id);
        processedMessages.push({
          id: m.id,
          chatId: chat.id,
          userId: effectiveUserId,
          role: m.role,
          content: m.jsonContent,
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          embedding: index !== -1 ? embeddings[index] : null
        });
      });
    } catch (error) {
      console.error('Error generating embeddings during saveChat:', error);
      // Fallback to saving without embeddings
      messagesWithExtractedText.forEach(m => {
        processedMessages.push({
          id: m.id,
          chatId: chat.id,
          userId: effectiveUserId,
          role: m.role,
          content: m.jsonContent,
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          embedding: null
        });
      });
    }
  } else {
    messagesWithExtractedText.forEach(m => {
      processedMessages.push({
        id: m.id,
        chatId: chat.id,
        userId: effectiveUserId,
        role: m.role,
        content: m.jsonContent,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        embedding: null
      });
    });
  }

  try {
    console.log(`[ChatAction] Saving chat ${chat.id} with ${chat.messages.length} messages`);
    const savedChatId = await dbSaveChat(newChatData, processedMessages);
    return savedChatId;
  } catch (error) {
    console.error('Error saving chat:', error);
    return null;
  }
}

export async function updateDrawingContext(chatId: string, contextData: { drawnFeatures: any[], cameraState: any }) {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    return { error: 'User not authenticated' };
  }

  const newDrawingMessage: DbNewMessage = {
    id: crypto.randomUUID(),
    userId: userId,
    chatId: chatId,
    role: 'data',
    content: JSON.stringify(contextData),
    createdAt: new Date(),
  };

  try {
    const savedMessage = await dbCreateMessage(newDrawingMessage);
    if (!savedMessage) {
      throw new Error('Failed to save drawing context message.');
    }
    return { success: true, messageId: savedMessage.id };
  } catch (error) {
    console.error('updateDrawingContext: Unexpected error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function saveSystemPrompt(
  userId: string,
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId) return { error: 'User ID is required' }
  if (!prompt) return { error: 'Prompt is required' }

  try {
    await db.update(users)
      .set({ systemPrompt: prompt })
      .where(eq(users.id, userId));

    return { success: true }
  } catch (error) {
    console.error('saveSystemPrompt: Error:', error)
    return { error: 'Failed to save system prompt' }
  }
}

export async function getSystemPrompt(
  userId: string
): Promise<string | null> {
  if (!userId) return null

  try {
    const result = await db.select({ systemPrompt: users.systemPrompt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0]?.systemPrompt || null;
  } catch (error) {
    console.error('getSystemPrompt: Error:', error)
    return null
  }
}

export async function shareChat(id: string): Promise<Chat | null> {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) return null;

    // Check if the user is the owner
    const chat = await dbGetChat(id, userId);
    if (!chat || chat.userId !== userId) {
      console.error('shareChat: Only owners can share chats');
      return null;
    }

    const [updatedChat] = await db
      .update(chats)
      .set({ visibility: 'public' })
      .where(eq(chats.id, id))
      .returning();

    return updatedChat as unknown as Chat;
  } catch (error) {
    console.error('shareChat: Unexpected error:', error);
    return null;
  }
}

export async function getSharedChat(id: string): Promise<Chat | null> {
  try {
    const [chat] = await db
      .select()
      .from(chats)
      .where(eq(chats.id, id))
      .limit(1);

    if (!chat || chat.visibility !== 'public') return null;

    const messages = await dbGetMessagesByChatId(id);

    return {
      ...chat,
      messages: messages.map(m => ({
        ...m,
        content: typeof m.content === 'string' && (m.content.startsWith('[') || m.content.startsWith('{')) ? JSON.parse(m.content) : m.content
      }))
    } as unknown as Chat;
  } catch (error) {
    console.error('getSharedChat: Unexpected error:', error)
    return null
  }
}
