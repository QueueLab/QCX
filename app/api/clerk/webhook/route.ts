import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and, isNotNull } from 'drizzle-orm'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the raw body for signature verification
  const body = await req.text()

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

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

  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses } = evt.data as any
    const email = email_addresses?.[0]?.email_address

    if (id) {
      try {
        // Atomic-ish check and update/insert
        const [existingUser] = await db.select()
          .from(users)
          .where(eq(users.clerkUserId, id))
          .limit(1);

        if (existingUser) {
          await db.update(users)
            .set({ email: email || existingUser.email })
            .where(eq(users.clerkUserId, id));
        } else {
          // If not found by Clerk ID, try linking by email if email exists
          let linked = false;
          if (email) {
            const [existingEmailUser] = await db.select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1);

            if (existingEmailUser) {
              await db.update(users)
                .set({ clerkUserId: id })
                .where(eq(users.id, existingEmailUser.id));
              linked = true;
            }
          }

          if (!linked) {
            // Final fallback: insert new user.
            // Use onConflictDoUpdate to handle race conditions where user was created between select and insert.
            await db.insert(users)
              .values({
                clerkUserId: id,
                email,
                role: 'viewer'
              })
              .onConflictDoUpdate({
                target: [users.clerkUserId],
                set: { email: email }
              });
          }
        }
      } catch (dbError: any) {
        console.error('Error syncing user in webhook:', dbError);

        // Return 500 for unexpected errors to trigger Clerk retries
        return new Response('Internal Database Error', { status: 500 });
      }
    }
  }

  return new Response('', { status: 200 })
}
