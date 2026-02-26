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
import { chats, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

export async function getChats(): Promise<DrizzleChat[]> {
  const userId = await getCurrentUserIdOnServer()

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

export async function getChat(id: string): Promise<DrizzleChat | null> {
  const userId = await getCurrentUserIdOnServer()
  const effectiveUserId = userId || 'anonymous'

  try {
    const chat = await dbGetChat(id, effectiveUserId)
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

  const userId = await getCurrentUserIdOnServer();
  const effectiveUserId = userId || 'anonymous';

  try {
    // Verify access rights (owner or public)
    const chat = await dbGetChat(chatId, effectiveUserId);
    if (!chat) {
       // Log warning if authenticated user tries to access inaccessible chat
       if (userId) {
         console.warn(`User ${userId} attempted to access messages for inaccessible chat ${chatId}`);
       }
       return [];
    }

    return dbGetMessagesByChatId(chatId);
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId} in getChatMessages:`, error);
    return [];
  }
}

export async function clearChats(): Promise<{ error?: string } | void> {
  const currentUserId = await getCurrentUserIdOnServer()
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

export async function saveChat(chat: OldChatType): Promise<string | null> {
  const userId = await getCurrentUserIdOnServer();

  if (!userId) {
    console.error('saveChat: userId is required (user not authenticated).')
    return null;
  }

  // Security Check: Prevent IDOR on Update
  if (chat.id) {
    // Check if the chat is accessible to the current user (owned or public)
    const accessibleChat = await dbGetChat(chat.id, userId);

    if (accessibleChat) {
      // If accessible, ensure the user is the owner before allowing updates
      // (Public chats shouldn't be modifiable by non-owners)
      if (accessibleChat.userId !== userId) {
        console.error(`saveChat: User ${userId} attempted to overwrite chat ${chat.id} owned by ${accessibleChat.userId}`);
        return null;
      }
    } else {
      // Chat not found via accessible path. Check if it exists globally (someone else's private chat)
      const [rawChat] = await db.select({ id: chats.id }).from(chats).where(eq(chats.id, chat.id)).limit(1);
      if (rawChat) {
        console.error(`saveChat: User ${userId} attempted to overwrite private chat ${chat.id}`);
        return null;
      }
      // If not found globally, it's a new chat with a client-generated ID. Proceed.
    }
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

export async function updateDrawingContext(chatId: string, contextData: { drawnFeatures: any[], cameraState: any }) {
  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    console.error('updateDrawingContext: Could not get current user ID.');
    return { error: 'User not authenticated' };
  }

  // Verify ownership before adding message
  try {
    const chat = await dbGetChat(chatId, userId);
    if (!chat || chat.userId !== userId) {
       console.error(`updateDrawingContext: User ${userId} attempted to modify chat ${chatId} they do not own.`);
       return { error: 'Unauthorized to modify this chat' };
    }
  } catch (error) {
    console.error('updateDrawingContext: Error verifying chat ownership:', error);
    return { error: 'Failed to verify chat ownership' };
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
  prompt: string
): Promise<{ success?: boolean; error?: string }> {
  const userId = await getCurrentUserIdOnServer();
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

export async function getSystemPrompt(): Promise<string | null> {
  const userId = await getCurrentUserIdOnServer();
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
