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
 * Retrieves chats for the authenticated user.
 * Protected against IDOR by using session-based userId.
 */
export async function getChats(userId?: string | null): Promise<DrizzleChat[]> {
  const currentUserId = await getCurrentUserIdOnServer();
  if (!currentUserId) {
    console.warn('getChats: User not authenticated');
    return [];
  }

  try {
    const { chats } = await dbGetChatsPage(currentUserId, 20, 0)
    return chats
  } catch (error) {
    console.error('Error fetching chats from DB:', error)
    return []
  }
}

/**
 * Retrieves a specific chat.
 * Protected against IDOR by using session-based userId and verifying access.
 */
export async function getChat(id: string, userId: string): Promise<DrizzleChat | null> {
  const currentUserId = await getCurrentUserIdOnServer();
  if (!currentUserId) {
    console.warn('getChat: User not authenticated');
    return null;
  }

  try {
    const chat = await dbGetChat(id, currentUserId)
    return chat
  } catch (error) {
    console.error(`Error fetching chat ${id} from DB:`, error)
    return null
  }
}

/**
 * Retrieves all messages for a specific chat.
 * Protected against IDOR by verifying user access to the chat.
 */
export async function getChatMessages(chatId: string): Promise<DrizzleMessage[]> {
  if (!chatId) {
    console.warn('getChatMessages called without chatId');
    return [];
  }

  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    console.warn('getChatMessages: User not authenticated');
    return [];
  }

  try {
    // Verify access (ownership or public visibility)
    const chat = await dbGetChat(chatId, userId);
    if (!chat) {
      console.warn(`getChatMessages: User ${userId} does not have access to chat ${chatId}`);
      return [];
    }
    return dbGetMessagesByChatId(chatId);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId} in getChatMessages:`, error);
    return [];
  }
}

/**
 * Clears all chats for the authenticated user.
 * Protected against IDOR by using session-based userId.
 */
export async function clearChats(
  userId?: string | null // Kept for backward compatibility but ignored in favor of session userId
): Promise<{ error?: string } | void> {
  const currentUserId = await getCurrentUserIdOnServer();
  if (!currentUserId) {
    console.error('clearChats: User not authenticated.');
    return { error: 'Unauthorized: Not authenticated' }
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

/**
 * Saves a chat for the authenticated user.
 * Protected against IDOR by using session-based userId.
 */
export async function saveChat(chat: OldChatType, userId: string): Promise<string | null> {
  const currentUserId = await getCurrentUserIdOnServer();
  if (!currentUserId) {
    console.error('saveChat: User not authenticated');
    return null;
  }

  const newChatData: DbNewChat = {
    id: chat.id,
    userId: currentUserId,
    title: chat.title || 'Untitled Chat',
    createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
    visibility: 'private',
    updatedAt: new Date(),
  };

  const newMessagesData: Omit<DbNewMessage, 'chatId'>[] = chat.messages.map(msg => ({
    id: msg.id,
    userId: currentUserId,
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
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    console.error('updateDrawingContext: Could not get current user ID.');
    return { error: 'User not authenticated' };
  }

  // Verify chat ownership before adding drawing context
  const chat = await dbGetChat(chatId, userId);
  if (!chat || chat.userId !== userId) {
    console.error(`updateDrawingContext: User ${userId} does not own chat ${chatId}`);
    return { error: 'Unauthorized: You do not have permission to update this chat' };
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
 * Saves the system prompt for the authenticated user.
 * Uses session-based userId to prevent IDOR.
 */
export async function saveSystemPrompt(
  userId: string, // Kept for backward compatibility but ignored in favor of session userId
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  const currentUserId = await getCurrentUserIdOnServer();
  if (!currentUserId) return { error: 'Unauthorized: Not authenticated' }
  if (!prompt) return { error: 'Prompt is required' }

  try {
    await db.update(users)
      .set({ systemPrompt: prompt })
      .where(eq(users.id, currentUserId));

    return { success: true }
  } catch (error) {
    console.error('saveSystemPrompt: Error:', error)
    return { error: 'Failed to save system prompt' }
  }
}

/**
 * Retrieves the system prompt for the authenticated user.
 * Uses session-based userId to prevent IDOR.
 */
export async function getSystemPrompt(
  userId: string // Kept for backward compatibility but ignored in favor of session userId
): Promise<string | null> {
  const currentUserId = await getCurrentUserIdOnServer();
  if (!currentUserId) return null

  try {
    const result = await db.select({ systemPrompt: users.systemPrompt })
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);

    return result[0]?.systemPrompt || null;
  } catch (error) {
    console.error('getSystemPrompt: Error:', error)
    return null
  }
}
