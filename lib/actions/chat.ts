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
  try {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      effectiveUserId = await getCurrentUserIdOnServer();
    }

    const supabase = getSupabaseServerClient()
    let query = supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Only filter by user_id if we have one (for testing without auth)
    if (effectiveUserId) {
      query = query.eq('user_id', effectiveUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching chats from Supabase:', error)
      return []
    }

    return (data as Chat[]) || []
  } catch (error) {
    console.error('getChats: Unexpected error:', error)
    return []
  }
}

export async function getChat(id: string): Promise<Chat | null> {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      console.warn('getChat called without authenticated user.')
      return null
    }

    // Validate that `id` is a UUID before querying Postgres.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.warn(`getChat: provided id does not look like a UUID: ${id}`)
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

    // Final check to ensure the user is a participant
    if (data && data.chat_participants.some((p: { user_id: string }) => p.user_id === userId)) {
      return data as Chat;
    }

    return null;
  } catch (error) {
    console.error('getChat: Unexpected error:', error)
    return null
  }
}

export async function getChatMessages(chatId: string): Promise<any[]> {
  try {
    if (!chatId) {
      console.warn('getChatMessages called without chatId')
      return []
    }
    const { data, error } = await supabaseGetMessagesByChatId(chatId)
    if (error) {
      return []
    }
    return data || []
  } catch (error) {
    console.error('getChatMessages: Unexpected error:', error)
    return []
  }
}

export async function clearChats(
  userId?: string | null
): Promise<{ error?: string } | void> {
  try {
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
  } catch (error) {
    console.error('clearChats: Unexpected error:', error)
    return { error: 'An unexpected error occurred while clearing chats' }
  }
}

export async function saveChat(chat: Chat, userId: string): Promise<string | null> {
  try {
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
  } catch (error) {
    console.error('saveChat: Unexpected error:', error)
    return null
  }
}

export async function updateDrawingContext(chatId: string, drawnFeatures: any[]) {
  try {
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
  } catch (error) {
    console.error('updateDrawingContext: Unexpected error:', error)
    return { error: 'An unexpected error occurred while updating drawing context' }
  }
}

export async function saveSystemPrompt(
  userId: string,
  prompt: string
): Promise<{ success?: boolean; error?:string }> {
  try {
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
  } catch (error) {
    console.error('saveSystemPrompt: Unexpected error:', error)
    return { error: 'An unexpected error occurred while saving system prompt' }
  }
}

export async function getSystemPrompt(
  userId: string
): Promise<string | null> {
  try {
    if (!userId) {
      console.error('getSystemPrompt: User ID is required')
      return null
    }

    const { data, error } = await supabaseGetSystemPrompt(userId)
    if (error) {
      return null
    }
    return data
  } catch (error) {
    console.error('getSystemPrompt: Unexpected error:', error)
    return null
  }
}
