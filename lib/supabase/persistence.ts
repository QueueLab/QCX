'use server'

import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/client'
import { type Chat, type AIMessage } from '@/lib/types'
import { PostgrestError } from '@supabase/supabase-js'

export async function saveChat(chat: Chat, userId: string): Promise<{ data: string | null; error: PostgrestError | null }> {
  const supabase = getSupabaseServiceClient()
  
  // First, upsert the chat
  const { data: chatData, error: chatError } = await supabase
    .from('chats')
    .upsert({
      id: chat.id,
      user_id: userId,
      title: chat.title || 'Untitled Chat',
      visibility: 'private',
      created_at: chat.createdAt ? new Date(chat.createdAt).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      path: chat.path,
      share_path: chat.sharePath
    }, {
      onConflict: 'id'
    })
    .select('id')
    .single()

  if (chatError) {
    console.error('Error saving chat:', chatError)
    return { data: null, error: chatError }
  }

  // Then, insert messages if there are any
  if (chat.messages && chat.messages.length > 0) {
    const messagesToInsert = chat.messages.map(message => ({
      id: message.id,
      chat_id: chat.id,
      user_id: userId,
      role: message.role,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    }))

    const { error: messagesError } = await supabase
      .from('messages')
      .upsert(messagesToInsert, {
        onConflict: 'id'
      })

    if (messagesError) {
      console.error('Error saving messages:', messagesError)
      return { data: null, error: messagesError }
    }
  }

  return { data: chat.id, error: null }
}

export async function getMessagesByChatId(chatId: string): Promise<{ data: any[] | null; error: PostgrestError | null }> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*, locations(*)')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return { data: null, error }
  }

  return { data: data, error: null }
}

export async function saveSystemPrompt(userId: string, prompt: string): Promise<{ error: PostgrestError | null }> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from('system_prompts')
    .upsert({ user_id: userId, prompt: prompt, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) {
    console.error('Error saving system prompt:', error)
  }

  return { error }
}

export async function getSystemPrompt(userId: string): Promise<{ data: string | null; error: PostgrestError | null }> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('system_prompts')
    .select('prompt')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error getting system prompt:', error)
    return { data: null, error }
  }

  return { data: data.prompt, error: null }
}

export async function saveDrawing(
  chatId: string,
  userId: string,
  geojson: any,
  name?: string
): Promise<{ data: { id: string } | null; error: PostgrestError | null }> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('locations')
    .insert({
      chat_id: chatId,
      user_id: userId,
      geojson: geojson,
      name: name,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving drawing:', error)
    return { data: null, error }
  }

  return { data: data, error: null }
}

export async function createMessage(messageData: {
    chat_id: string,
    user_id: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    location_id?: string
}): Promise<{ data: AIMessage | null; error: PostgrestError | null }> {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.from('messages').insert(messageData).select().single();
    if (error) {
        console.error('Error creating message:', error);
    }
    return { data: data as AIMessage, error };
}
