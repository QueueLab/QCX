import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TIER_CONFIGS, TIERS, Tier } from '@/lib/utils/subscription';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not set' }, { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27-ac' as any,
  });

  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
      return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not set' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || session.metadata?.userId;

    if (userId) {
      const standardPriceId = process.env.STANDARD_TIER_PRICE_ID;
      let tier: Tier = TIERS.FREE;
      let creditsToAdd = 0;

      if (session.line_items?.data[0]?.price?.id === standardPriceId) {
        tier = TIERS.STANDARD;
        creditsToAdd = TIER_CONFIGS[TIERS.STANDARD].credits;
      } else {
          tier = TIERS.STANDARD;
          creditsToAdd = TIER_CONFIGS[TIERS.STANDARD].credits;
      }

      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (currentUser) {
        await db
          .update(users)
          .set({
            tier: tier,
            credits: currentUser.credits + creditsToAdd,
          })
          .where(eq(users.id, userId));

        console.log(`[Webhook] Successfully upgraded user ${userId} to ${tier}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
