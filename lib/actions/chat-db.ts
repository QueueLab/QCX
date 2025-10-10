import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Chat, type Message } from '@/lib/types';

export type NewChat = Omit<Chat, 'id' | 'createdAt' | 'path' | 'messages'> & { id?: string };
export type NewMessage = Omit<Message, 'id' | 'createdAt'>;

export async function getChat(id: string, userId: string): Promise<Chat | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chats')
    .select()
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
  return data as Chat;
}

export async function getChatsPage(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chats')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching chats:', error);
    return { chats: [], nextOffset: null };
  }

  const nextOffset = data.length === limit ? offset + limit : null;
  return { chats: data as Chat[], nextOffset };
}

export async function saveChat(chatData: NewChat, messagesData: Omit<NewMessage, 'chatId'>[]): Promise<string | null> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc('save_chat_with_messages', {
        chat_id_input: chatData.id,
        user_id_input: chatData.userId,
        title_input: chatData.title,
        messages_input: messagesData,
    });

    if (error) {
        console.error('Error saving chat:', error);
        return null;
    }
    return data;
}

export async function createMessage(messageData: NewMessage): Promise<Message | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();

  if (error) {
    console.error('Error creating message:', error);
    return null;
  }
  return data as Message;
}

export async function deleteChat(id: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
  return true;
}

export async function clearHistory(userId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing history:', error);
    return false;
  }
  return true;
}

export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data as Message[];
}