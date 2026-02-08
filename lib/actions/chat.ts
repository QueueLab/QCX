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
  getChat as supabaseGetChat,
  getChats as supabaseGetChats,
  clearChats as supabaseClearChats,
  getSharedChat as supabaseGetSharedChat,
} from '@/lib/supabase/persistence'
import { getSupabaseServerClient } from '../supabase/client'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

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

    const { data, error } = await supabaseGetChats(effectiveUserId)

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

    const { data, error } = await supabaseGetChat(id, effectiveUserId)

    if (error) {
      console.error('Error fetching chat from Supabase:', error)
      return null
    }

    return data as Chat
  } catch (error) {
    console.error('getChat: Unexpected error:', error)
    return null
  }
}

export async function clearChats(userId?: string | null): Promise<{ error?: string } | void> {
  try {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      effectiveUserId = await getCurrentUserIdOnServer();
    }

    if (!effectiveUserId) {
      return { error: 'User not authenticated' }
    }

    const { error } = await supabaseClearChats(effectiveUserId)
    if (error) {
      return { error: 'Failed to clear chats' }
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
  try {
    if (!userId && !chat.userId) {
      console.error('saveChat: userId is required either as a parameter or in chat object.')
      return null
    }
    const effectiveUserId = userId || chat.userId

    console.log(`[ChatAction] Attempting to save chat ${chat.id} for user ${effectiveUserId}`);
    const { data, error } = await supabaseSaveChat(chat, effectiveUserId)

    if (error) {
      console.error('Error saving chat:', error);
      console.log('Failed chat data:', chat);
      return null
    }
    console.log(`[ChatAction] Successfully saved chat ${chat.id}`);
    return data
  } catch (error) {
    console.error('saveChat: Unexpected error:', error)
    return null
  }
}

export async function updateDrawingContext(chatId: string, contextData: { drawnFeatures: any[], cameraState: any }) {
  'use server';
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      console.error('updateDrawingContext: Could not get current user ID. User must be authenticated.');
      return { error: 'User not authenticated' };
    }

    const { data: locationData, error: drawingError } = await supabaseSaveDrawing(chatId, userId, { 
      features: contextData.drawnFeatures,
      cameraState: contextData.cameraState 
    });

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
    return { error: 'An unexpected error occurred' }
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

    const { error } = await supabaseSaveSystemPrompt(userId, prompt)
    if (error) {
      return { error: 'Failed to save system prompt' }
    }
    return { success: true }
  } catch (error) {
    console.error('saveSystemPrompt: Unexpected error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getSystemPrompt(
  userId: string
): Promise<string | null> {
  try {
    if (!userId) {
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

export async function getChatMessages(chatId: string): Promise<AIMessage[]> {
  try {
    const { data, error } = await supabaseGetMessagesByChatId(chatId)
    if (error) {
      console.error('Error fetching chat messages:', error)
      return []
    }
    return (data as any[]).map(m => ({
        ...m,
        content: typeof m.content === 'string' ? JSON.parse(m.content) : m.content
    })) as AIMessage[]
  } catch (error) {
    console.error('getChatMessages: Unexpected error:', error)
    return []
  }
}

export async function shareChat(id: string): Promise<Chat | null> {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      console.error('shareChat: User not authenticated');
      return null;
    }

    const supabase = getSupabaseServerClient();

    // First, check if the user is the owner
    const { data: participant, error: pError } = await supabase
      .from('chat_participants')
      .select('role')
      .eq('chat_id', id)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (pError || !participant) {
      console.error('shareChat: Only owners can share chats');
      return null;
    }

    const { data, error } = await supabase
      .from('chats')
      .update({ visibility: 'public' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error sharing chat:', error);
      return null;
    }

    return data as Chat;
  } catch (error) {
    console.error('shareChat: Unexpected error:', error);
    return null;
  }
}

export async function getSharedChat(id: string): Promise<Chat | null> {
  try {
    const { data, error } = await supabaseGetSharedChat(id)
    if (error) {
      console.error('Error fetching shared chat:', error)
      return null
    }
    return data as Chat
  } catch (error) {
    console.error('getSharedChat: Unexpected error:', error)
    return null
  }
}
