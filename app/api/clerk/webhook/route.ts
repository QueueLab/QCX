import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Do something with the payload
  const { id } = evt.data
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id: clerkId, email_addresses, first_name, last_name } = evt.data as any
    const email = email_addresses?.[0]?.email_address || null
    const firstName = first_name || null
    const lastName = last_name || null
    const avatarUrl = (evt.data as any).image_url || null

    if (clerkId) {
      // ============================================================
      // SYNC TO QCX APP DATABASE (via Drizzle)
      // ============================================================
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.clerkUserId, clerkId))
        .limit(1);

      if (existingUser) {
        // Update existing user with latest Clerk data
        await db.update(users)
          .set({
            email,
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(avatarUrl && { avatarUrl }),
          })
          .where(eq(users.clerkUserId, clerkId));
      } else {
        // Check by email first to link existing Supabase-created user to Clerk
        const [existingEmailUser] = await db.select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingEmailUser) {
          // Link existing user to this Clerk ID
          await db.update(users)
            .set({ clerkUserId: clerkId })
            .where(eq(users.id, existingEmailUser.id));
        } else {
          // Create new user record
          await db.insert(users).values({
            clerkUserId: clerkId,
            email,
            role: 'viewer',
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(avatarUrl && { avatarUrl }),
          });
        }
      }

      // ============================================================
      // SYNC TO QCX-BACKEND SUPABASE (via RPC)
      // This ensures the edge function and RLS policies in QCX-BACKEND
      // have the correct clerk_user_id for authentication.
      // ============================================================
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)

          // Call the sync_clerk_user RPC function in QCX-BACKEND
          // This is the canonical way to create/link users across both systems
          const { data: backendUserId, error: rpcError } = await supabase.rpc('sync_clerk_user', {
            p_clerk_id: clerkId,
            p_email: email,
            p_first_name: firstName,
            p_last_name: lastName,
            p_avatar_url: avatarUrl,
          })

          if (rpcError) {
            console.error(`[Webhook] Failed to sync user ${clerkId} to QCX-BACKEND:`, rpcError)
          } else {
            console.log(`[Webhook] Successfully synced user ${clerkId} to QCX-BACKEND (UUID: ${backendUserId})`)
          }
        } catch (err) {
          console.error(`[Webhook] Exception syncing user ${clerkId} to QCX-BACKEND:`, err)
          // Don't fail the webhook — the app DB sync already succeeded
        }
      } else {
        console.warn('[Webhook] Supabase credentials not configured, skipping QCX-BACKEND sync')
      }
    }
  }

  if (eventType === 'user.deleted') {
    // Optionally handle user deletion
    // For safety, we might not want to delete user data entirely
    console.log('[Webhook] User deleted event received:', evt.data)
  }

  return new Response('', { status: 200 })
}
