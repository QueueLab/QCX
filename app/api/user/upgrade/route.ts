import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TIER_CONFIGS, TIERS, parseTier } from '@/lib/utils/subscription';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tier } = await req.json();

    // Validate tier
    if (!tier || !Object.values(TIERS).includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Get tier config to determine credits to add
    const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
    if (!tierConfig) {
      return NextResponse.json(
        { error: 'Tier not found' },
        { status: 400 }
      );
    }

    // Get current user from database
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate credits to add
    const creditsToAdd = tierConfig.credits;
    const newCreditsTotal = currentUser.credits + creditsToAdd;

    // Update user in database with new tier and credits
    const updatedUser = await db
      .update(users)
      .set({
        tier: tier,
        credits: newCreditsTotal
      })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      success: true,
      tier: tier,
      creditsAdded: creditsToAdd,
      totalCredits: newCreditsTotal,
      message: `Successfully upgraded to ${tier} tier with ${creditsToAdd} credits`
    });

  } catch (error) {
    console.error('Error upgrading user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
