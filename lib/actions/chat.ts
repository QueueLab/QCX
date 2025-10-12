'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type Chat, type AIMessage } from '@/lib/types'
import {
  saveChat as supabaseSaveChat,
  getMessagesByChatId as supabaseGetMessagesByChatId,
  saveSystemPrompt as supabaseSaveSystemPrompt,
  getSystemPrompt as supabaseGetSystemPrompt,
  saveDrawing as supabaseSaveDrawing,
  createMessage as supabaseCreateMessage,
} from '@/lib/supabase/persistence'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { getSupabaseServerClient } from '../supabase/client'

export async function getChats(userId?: string | null): Promise<Chat[]> {
  if (!userId) {
    console.warn('getChats called without userId, returning empty array.')
    return []
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('chats')
    .select('*')

  if (error) {
    console.error('Error fetching chats from Supabase:', error)
    return []
  }

  return (data as Chat[]) || []
}

export async function getChat(id: string, userId: string): Promise<Chat | null> {
  if (!userId) {
    console.warn('getChat called without userId.')
    return null
  }
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('chats')
    .select('*, chat_participants!inner(*)')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Error fetching chat ${id} from Supabase:`, error)
    return null
  }

  return data as Chat
}

export async function getChatMessages(chatId: string): Promise<any[]> {
  if (!chatId) {
    console.warn('getChatMessages called without chatId')
    return []
  }
  const { data, error } = await supabaseGetMessagesByChatId(chatId)
  if (error) {
    return []
  }
  return data || []
}

export async function clearChats(
  userId?: string | null
): Promise<{ error?: string } | void> {
  const currentUserId = userId || (await getCurrentUserIdOnServer())
  if (!currentUserId) {
    console.error('clearChats: No user ID provided or found.')
    return { error: 'User ID is required to clear chats' }
  }

  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from('chats').delete().eq('user_id', currentUserId)

  if (error) {
    console.error('Error clearing chats from Supabase:', error)
    return { error: 'Failed to clear chat history' }
  }

  revalidatePath('/')
  redirect('/')
}

export async function saveChat(chat: Chat, userId: string): Promise<string | null> {
  if (!userId && !chat.userId) {
    console.error('saveChat: userId is required either as a parameter or in chat object.')
    return null
  }
  const effectiveUserId = userId || chat.userId

  const { data, error } = await supabaseSaveChat(chat, effectiveUserId)

  if (error) {
    return null
  }
  return data
}

export async function updateDrawingContext(chatId: string, drawnFeatures: any[]) {
  'use server';
  console.log('[Action] updateDrawingContext called for chatId:', chatId);

  const userId = await getCurrentUserIdOnServer();
  if (!userId) {
    console.error('updateDrawingContext: Could not get current user ID. User must be authenticated.');
    return { error: 'User not authenticated' };
  }

  const { data: locationData, error: drawingError } = await supabaseSaveDrawing(chatId, userId, { features: drawnFeatures });

  if (drawingError || !locationData) {
    return { error: 'Failed to save drawing' };
  }

  const { data: messageData, error: messageError } = await supabaseCreateMessage({
    chat_id: chatId,
    user_id: userId,
    role: 'user',
    content: 'A drawing has been made.',
    location_id: locationData.id,
  });

  if (messageError) {
    return { error: 'Failed to create message for drawing' };
  }

  return { success: true, messageId: messageData?.id };
}

export async function saveSystemPrompt(
  userId: string,
  prompt: string
): Promise<{ success?: boolean; error?:string }> {
  if (!userId) {
    return { error: 'User ID is required' }
  }

  if (!prompt) {
    return { error: 'Prompt is required' }
  }

  const { error } = await supabaseSaveSystemPrompt(userId, prompt)
  if (error) {
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

  const { data, error } = await supabaseGetSystemPrompt(userId)
  if (error) {
    return null
  }
  return data
}
