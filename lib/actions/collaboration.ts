'use server'

import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/client'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

export async function inviteUserToChat(chatId: string, email: string): Promise<{ error?: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const inviterId = await getCurrentUserIdOnServer()

    if (!inviterId) {
      return { error: 'You must be logged in to invite users.' }
    }

    // Check if the inviter is the owner of the chat
    const { data: ownerData, error: ownerError } = await supabase
      .from('chat_participants')
      .select('role')
      .eq('chat_id', chatId)
      .eq('user_id', inviterId)
      .single()

    if (ownerError || ownerData?.role !== 'owner') {
      return { error: 'You do not have permission to invite users to this chat.' }
    }

    // Get the user ID of the person being invited using admin client
    const adminClient = getSupabaseServiceClient()
    const { data: { users }, error: userError } = await adminClient.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return { error: 'Failed to look up user by email.' }
    }

    const invitedUser = users.find(u => u.email === email)
    if (!invitedUser) {
      return { error: 'Could not find a user with that email address.' }
    }

    // Add the user to the chat_participants table
    const { error: insertError } = await supabase
      .from('chat_participants')
      .insert({ chat_id: chatId, user_id: invitedUser.id, role: 'collaborator' })

    if (insertError) {
      console.error('Error inviting user to chat:', insertError)
      if (insertError.code === '23505') { // unique constraint violation
          return { error: 'User is already in this chat.' };
      }
      return { error: 'Failed to invite user to the chat.' }
    }

    return {}
  } catch (error) {
    console.error('inviteUserToChat: Unexpected error:', error)
    return { error: 'An unexpected error occurred while inviting user to chat' }
  }
}
