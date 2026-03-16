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

/**
 * Retrieves chats for the current authenticated user.
 * Protected against IDOR by retrieving userId from session.
 */
export async function getChats(): Promise<DrizzleChat[]> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    console.warn('getChats: No authenticated user found.')
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

/**
 * Retrieves a specific chat, ensuring the current user has access.
 * Protected against IDOR by retrieving userId from session.
 */
export async function getChat(id: string): Promise<DrizzleChat | null> {
  const userId = await getCurrentUserIdOnServer()
  try {
    // dbGetChat verifies ownership or public visibility
    const chat = await dbGetChat(id, userId || 'anonymous')
    return chat
  } catch (error) {
    console.error(`Error fetching chat ${id} from DB:`, error)
    return null
  }
}

/**
 * Retrieves all messages for a specific chat, ensuring the current user has access.
 * Protected against IDOR by verifying chat access before fetching messages.
 */
export async function getChatMessages(chatId: string): Promise<DrizzleMessage[]> {
  if (!chatId) {
    console.warn('getChatMessages called without chatId');
    return [];
  }

  const userId = await getCurrentUserIdOnServer();

  try {
    // Verify user has access to this chat before returning messages
    const chat = await dbGetChat(chatId, userId || 'anonymous');
    if (!chat) {
      console.warn(`getChatMessages: Unauthorized access attempt to chat ${chatId}`);
      return [];
    }

    return dbGetMessagesByChatId(chatId);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId} in getChatMessages:`, error);
    return [];
  }
}

/**
 * Clears chat history for the current authenticated user.
 */
export async function clearChats(): Promise<{ error?: string } | void> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    console.error('clearChats: No authenticated user found.')
    return { error: 'Authentication required to clear chats' }
  }

  try {
    const success = await dbClearHistory(userId)
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

/**
 * Saves a chat for the current authenticated user.
 */
export async function saveChat(chat: OldChatType): Promise<string | null> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) {
    console.error('saveChat: User not authenticated.')
    return null
  }

  const newChatData: DbNewChat = {
    id: chat.id,
    userId: userId,
    title: chat.title || 'Untitled Chat',
    createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
    visibility: 'private',
    updatedAt: new Date(),
  };

  const newMessagesData: Omit<DbNewMessage, 'chatId'>[] = chat.messages.map(msg => ({
    id: msg.id,
    userId: userId,
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

/**
 * Updates drawing context for a chat.
 */
export async function updateDrawingContext(chatId: string, contextData: { drawnFeatures: any[], cameraState: any }) {
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

/**
 * Saves the system prompt for the current authenticated user.
 */
export async function saveSystemPrompt(
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  const userId = await getCurrentUserIdOnServer()
  if (!userId) return { error: 'Authentication required' }
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

/**
 * Retrieves the system prompt for the current authenticated user.
 */
export async function getSystemPrompt(): Promise<string | null> {
  const userId = await getCurrentUserIdOnServer()
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
