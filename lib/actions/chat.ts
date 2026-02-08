'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type Chat as OldChatType, type AIMessage } from '@/lib/types'
import {
  getChatsPage as dbGetChatsPage,
  getChat as dbGetChat,
  clearHistory as dbClearHistory,
  saveChat as dbSaveChat,
  createMessage as dbCreateMessage,
  getMessagesByChatId as dbGetMessagesByChatId,
  type Chat as DrizzleChat,
  type Message as DrizzleMessage,
  type NewChat as DbNewChat,
  type NewMessage as DbNewMessage
} from '@/lib/actions/chat-db'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

export async function getChats(userId?: string | null): Promise<DrizzleChat[]> {
  if (!userId) {
    console.warn('getChats called without userId, returning empty array.')
    return []
  }

  try {
    const { chats } = await dbGetChatsPage(userId, 20, 0)
    return chats
  } catch (error) {
    console.error('Error fetching chats from DB:', error)
    return []
  }
}

export async function getChat(id: string, userId: string): Promise<DrizzleChat | null> {
  if (!userId) {
    console.warn('getChat called without userId.')
    return null;
  }
  try {
    const chat = await dbGetChat(id, userId)
    return chat
  } catch (error) {
    console.error(`Error fetching chat ${id} from DB:`, error)
    return null
  }
}

/**
 * Retrieves all messages for a specific chat.
 */
export async function getChatMessages(chatId: string): Promise<DrizzleMessage[]> {
  if (!chatId) {
    console.warn('getChatMessages called without chatId');
    return [];
  }
  try {
    return dbGetMessagesByChatId(chatId);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId} in getChatMessages:`, error);
    return [];
  }
}

export async function clearChats(
  userId?: string | null
): Promise<{ error?: string } | void> {
  const currentUserId = userId || (await getCurrentUserIdOnServer())
  if (!currentUserId) {
    console.error('clearChats: No user ID provided or found.')
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
    console.error('Error clearing chats from DB:', error)
    return { error: 'Failed to clear chat history' }
  }
}

export async function saveChat(chat: OldChatType, userId: string): Promise<string | null> {
  if (!userId && !chat.userId) {
    console.error('saveChat: userId is required either as a parameter or in chat object.')
    return null;
  }
  const effectiveUserId = userId || chat.userId;

  const newChatData: DbNewChat = {
    id: chat.id,
    userId: effectiveUserId,
    title: chat.title || 'Untitled Chat',
    createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
    visibility: 'private',
    updatedAt: new Date(),
  };

  const newMessagesData: Omit<DbNewMessage, 'chatId'>[] = chat.messages.map(msg => ({
    id: msg.id,
    userId: effectiveUserId,
    role: msg.role,
    content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
  }));

  try {
    const savedChatId = await dbSaveChat(newChatData, newMessagesData);
    return savedChatId;
  } catch (error) {
    console.error('Error saving chat to DB:', error);
    return null;
  }
}

export async function updateDrawingContext(chatId: string, contextData: { drawnFeatures: any[], cameraState: any }) {
  'use server';
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    console.error('updateDrawingContext: Could not get current user ID.');
    return { error: 'User not authenticated' };
  }

  const newDrawingMessage: DbNewMessage = {
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
    console.error('updateDrawingContext: Error saving drawing context message:', error);
    return { error: 'Failed to save drawing context message' };
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
