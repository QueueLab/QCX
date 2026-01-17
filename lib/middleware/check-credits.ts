import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { getSupabaseServerClient } from '@/lib/supabase/client';

export async function checkAndConsumeCredits(req: NextRequest, creditsToConsume: number = 10) {
  const userId = await getCurrentUserIdOnServer();
  
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  const supabase = getSupabaseServerClient();
  
  // Fetch current credits
  const { data: user, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Error fetching user credits:', error);
    return { error: 'User not found', status: 404 };
  }

  if (user.credits < creditsToConsume) {
    return { error: 'Insufficient credits', status: 403 };
  }

  // Deduct credits
  const { error: updateError } = await supabase
    .from('users')
    .update({ credits: user.credits - creditsToConsume })
    .eq('id', userId);

  if (updateError) {
     console.error('Error deducting credits:', updateError);
     return { error: 'Failed to process transaction', status: 500 };
  }

  return { success: true, remainingCredits: user.credits - creditsToConsume };
}
