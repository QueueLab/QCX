'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type Chat as OldChatType, type AIMessage } from '@/lib/types' // Added AIMessage, OldChatType for transition
import {
  getChatsPage as dbGetChatsPage,
  getChat as dbGetChat,
  clearHistory as dbClearHistory,
  saveChat as dbSaveChat,
  createMessage as dbCreateMessage,
  getMessagesByChatId as dbGetMessagesByChatId, // Added
  type Chat as DrizzleChat,
  type Message as DrizzleMessage, // Added
  type NewChat as DbNewChat,
  type NewMessage as DbNewMessage
} from '@/lib/actions/chat-db'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user' // For operations needing current user

// TODO: Migrate Redis-based functions below (saveSystemPrompt, getSystemPrompt) if needed.
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
//   token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
// })

export async function getChats(userId?: string | null): Promise<DrizzleChat[]> {
  if (!userId) {
    console.warn('getChats called without userId, returning empty array.')
    return []
  }

  try {
    // Using a default limit and offset for now
    const { chats } = await dbGetChatsPage(userId, 20, 0)
    return chats
  } catch (error) {
    console.error('Error fetching chats from DB:', error)
    return []
  }
}

export async function getChat(id: string, userId: string): Promise<DrizzleChat | null> {
  // userId is now mandatory for dbGetChat to check ownership or public status
  if (!userId) {
    console.warn('getChat called without userId.')
    // Optionally, could try to fetch only public chat if that's a use case
    // return await dbGetChat(id, ''); // Pass empty or a specific marker for anonymous
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
 * @param chatId The ID of the chat.
 * @returns A promise that resolves to an array of DrizzleMessage objects.
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
  userId?: string | null // Changed to optional, will try to get current user if not provided
): Promise<{ error?: string } | void> { // void for success
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
    // Revalidation and redirect should ideally be handled by the caller (e.g., Server Action, API route)
    // For now, keeping them as they were, but this makes the function less reusable.
    revalidatePath('/')
    redirect('/')
  } catch (error) {
    console.error('Error clearing chats from DB:', error)
    return { error: 'Failed to clear chat history' }
  }
}

export async function saveChat(chat: OldChatType, userId: string): Promise<string | null> {
  // This function now maps the old Chat type to new Drizzle types
  // and calls the new dbSaveChat function.
  if (!userId && !chat.userId) {
    console.error('saveChat: userId is required either as a parameter or in chat object.')
    return null;
  }
  const effectiveUserId = userId || chat.userId;

  const newChatData: DbNewChat = {
    id: chat.id, // Keep existing ID if present (for updates)
    userId: effectiveUserId,
    title: chat.title || 'Untitled Chat',
    createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(), // Ensure Date object
    visibility: 'private', // Default or map from old chat if available
    // sharePath: chat.sharePath, // sharePath is not in new schema by default
  };

  const newMessagesData: Omit<DbNewMessage, 'chatId'>[] = chat.messages.map(msg => ({
    id: msg.id, // Keep existing ID
    userId: effectiveUserId, // Ensure messages have a userId
    role: msg.role, // Allow all AIMessage roles to pass through
    content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    // attachments: (msg as any).attachments, // If AIMessage had attachments
    // type: (msg as any).type // If AIMessage had a type
  }));

  try {
    const savedChatId = await dbSaveChat(newChatData, newMessagesData);
    return savedChatId;
  } catch (error) {
    console.error('Error saving chat to DB:', error);
    return null;
  }
}

// TODO: Re-evaluate sharing functionality with Supabase if needed.
// PR #533 removes the share page, so these are likely deprecated for now.
// export async function getSharedChat(id: string) {
//   // This would need to be reimplemented using dbGetChat with public visibility logic
//   // const chat = await dbGetChat(id, ''); // Need a way to signify public access
//   // if (!chat || chat.visibility !== 'public') { // Assuming 'public' visibility for shared
//   //   return null;
//   // }
//   // return chat;
//   console.warn("getSharedChat is deprecated and needs reimplementation with new DB structure.");
//   return null;
// }

// export async function shareChat(id: string, userId: string) {
//   // This would involve updating a chat's visibility to 'public' in the DB
//   // and potentially creating a unique share link if `sharePath` is not just derived.
//   // const chat = await dbGetChat(id, userId);
//   // if (!chat) {
//   //   return null;
//   // }
//   // // Update chat visibility to public
//   // // const updatedChat = await db.update(chatsTable).set({ visibility: 'public' }).where(eq(chatsTable.id, id)).returning();
//   // // return updatedChat[0];
//   console.warn("shareChat is deprecated and needs reimplementation with new DB structure.");
//   return null;
// }

export async function updateDrawingContext(chatId: string, contextData: { drawnFeatures: any[], cameraState: any }) {
  'use server';
  console.log('[Action] updateDrawingContext called for chatId:', chatId);

  const userId = await getCurrentUserIdOnServer(); // Essential for creating a user-associated message
  if (!userId) {
    console.error('updateDrawingContext: Could not get current user ID. User must be authenticated.');
    return { error: 'User not authenticated' };
  }

  // The old version fetched the whole chat. Now we just create a new message.
  // The AIMessage type might be from '@/lib/types' and need mapping to DbNewMessage
  const newDrawingMessage: Omit<DbNewMessage, 'chatId'> = {
    // id: `drawnData-${Date.now().toString()}`, // Let DB generate UUID
    userId: userId,
    role: 'data' as 'user' | 'assistant' | 'system' | 'tool' | 'data', // Cast 'data' if not in standard roles
    content: JSON.stringify(contextData), // Store both features and camera state as stringified JSON
    // type: 'drawing_context', // This field is not in the Drizzle 'messages' schema.
    // If `type` is important, the schema needs to be updated or content needs to reflect it.
    // For now, we'll assume 'content' holds the necessary info and role='data' signifies it.
    createdAt: new Date(),
  };

  try {
    // We need to ensure the message is associated with the chat.
    // dbCreateMessage requires chatId.
    const messageToSave: DbNewMessage = {
      ...newDrawingMessage,
      chatId: chatId,
    };
    const savedMessage = await dbCreateMessage(messageToSave);
    if (!savedMessage) {
      throw new Error('Failed to save drawing context message.');
    }
    console.log('Drawing context message added to chat:', chatId, 'messageId:', savedMessage.id);
    return { success: true, messageId: savedMessage.id };
  } catch (error) {
    console.error('updateDrawingContext: Error saving drawing context message:', error);
    return { error: 'Failed to save drawing context message' };
  }
}

// TODO: These Redis-based functions for system prompt need to be migrated
// if their functionality is still required and intended to use the new DB.
// For now, they are left as is, but will likely fail if Redis config is removed.
// @ts-ignore - Ignoring Redis import error for now as it might be removed or replaced
import { Redis } from '@upstash/redis'; // This will cause issues if REDIS_URL is not configured.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim() || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
});


export async function saveSystemPrompt(
  userId: string,
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId) {
    return { error: 'User ID is required' }
  }

  if (!prompt) {
    return { error: 'Prompt is required' }
  }

  try {
    await redis.set(`system_prompt:${userId}`, prompt)
    return { success: true }
  } catch (error) {
    console.error('saveSystemPrompt: Error saving system prompt:', error)
    return { error: 'Failed to save system prompt' }
  }
}

export async function getSystemPrompt(
  userId: string
): Promise<string | null> {
  if (!userId) {
    console.error('getSystemPrompt: User ID is required')
    return null
  }

  try {
    const prompt = await redis.get<string>(`system_prompt:${userId}`)
    return prompt
  } catch (error) {
    console.error('getSystemPrompt: Error retrieving system prompt:', error)
    return null
  }
}
