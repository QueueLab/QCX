import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { TIERS, parseTier, getTierConfig } from '@/lib/utils/subscription';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    });

    if (!dbUser) {
      // Create user if they don't exist in the database
      const [newUser] = await db.insert(users).values({
        id: user.id,
        credits: 0,
        tier: 'free'
      }).returning();
      dbUser = newUser;
    }

    const tier = parseTier(dbUser.tier);
    // If user is not on Standard tier, they might not need credits logic,
    // but for now we return the credits regardless.
    // If the tier doesn't support credits (e.g. Free or Pro), the UI can handle it.
    
    return NextResponse.json({
      credits: dbUser.credits,
      tier: tier,
      features: getTierConfig(tier)
    });

  } catch (error) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
