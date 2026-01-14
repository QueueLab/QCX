import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/client';
import { TIERS, parseTier } from '@/lib/utils/subscription';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, supabaseUser.id),
    });

    if (!user) {
       // If user doesn't exist in our table yet, return defaults
       return NextResponse.json({
        credits: 0,
        tier: TIERS.FREE
      });
    }

    return NextResponse.json({
      credits: user.credits,
      tier: parseTier(user.tier),
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
