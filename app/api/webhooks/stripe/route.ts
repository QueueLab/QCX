import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServiceClient } from '@/lib/supabase/client';
import { TIER_CONFIGS, TIERS } from '@/lib/utils/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId) {
          console.log(`Processing checkout for user: ${userId}`);
          // Update user credits and tier
          // Assuming Standard Tier for this example, or derive from session
           const standardCredits = TIER_CONFIGS[TIERS.STANDARD].credits;
           
          const { error } = await supabase
            .from('users')
            .update({ 
                credits: standardCredits,
                tier: 'standard',
                // updated_at: new Date().toISOString() 
            })
            .eq('id', userId);

          if (error) {
            console.error('Error updating user credits in Supabase:', error);
            throw error;
          }
          console.log(`Updated credits for user ${userId} to ${standardCredits}`);
        }
        break;
      }
      // Handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
