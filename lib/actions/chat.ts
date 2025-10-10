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
  type NewChat as DbNewChat,
  type NewMessage as DbNewMessage
} from '@/lib/actions/chat-db'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { type Chat, type Message } from '@/lib/types'

export async function getChats(userId?: string | null): Promise<Chat[]> {
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

export async function getChat(id: string, userId: string): Promise<Chat | null> {
  if (!userId) {
    console.warn('getChat called without userId.')
    return null
  }
  try {
    const chat = await dbGetChat(id, userId)
    return chat
  } catch (error) {
    console.error(`Error fetching chat ${id} from DB:`, error)
    return null
  }
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
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
  };

  const newMessagesData: Omit<DbNewMessage, 'chatId'>[] = chat.messages.map(msg => ({
    id: msg.id,
    userId: effectiveUserId,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt,
  }));

  try {
    const savedChatId = await dbSaveChat(newChatData, newMessagesData);
    return savedChatId;
  } catch (error) {
    console.error('Error saving chat to DB:', error);
    return null;
  }
}

export async function updateDrawingContext(chatId: string, drawnFeatures: any[]) {
  'use server';
  console.log('[Action] updateDrawingContext called for chatId:', chatId);

  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    console.error('updateDrawingContext: Could not get current user ID. User must be authenticated.');
    return { error: 'User not authenticated' };
  }

  const newDrawingMessage: Omit<DbNewMessage, 'chatId'> = {
    userId: userId,
    role: 'data' as any,
    content: JSON.stringify(drawnFeatures),
  };

  try {
    const messageToSave: any = {
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

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('system_prompts')
    .upsert({ user_id: userId, prompt: prompt }, { onConflict: 'user_id' });

  if (error) {
    console.error('saveSystemPrompt: Error saving system prompt:', error)
    return { error: 'Failed to save system prompt' }
  }

  return { success: true }
}

export async function getSystemPrompt(
  userId: string
): Promise<string | null> {
  if (!userId) {
    console.error('getSystemPrompt: User ID is required')
    return null
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('system_prompts')
    .select('prompt')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // PostgREST error for "No rows found"
      return null;
    }
    console.error('getSystemPrompt: Error retrieving system prompt:', error)
    return null
  }

  return data.prompt;
}