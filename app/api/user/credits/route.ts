import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TIERS, parseTier, getTierConfig } from '@/lib/utils/subscription';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const tier = parseTier(dbUser.tier);
    
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
