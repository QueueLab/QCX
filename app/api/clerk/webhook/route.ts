import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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
  // For this guide, you can log the payload to your console
  const { id } = evt.data
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data as any
    const email = email_addresses[0]?.email_address

    if (id) {
        // Upsert user
        const [existingUser] = await db.select()
          .from(users)
          .where(eq(users.clerkUserId, id))
          .limit(1);

        if (existingUser) {
          await db.update(users)
            .set({ email })
            .where(eq(users.clerkUserId, id));
        } else {
            // Check by email first to link
            const [existingEmailUser] = await db.select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            if (existingEmailUser) {
                await db.update(users)
                    .set({ clerkUserId: id })
                    .where(eq(users.id, existingEmailUser.id));
            } else {
                await db.insert(users).values({
                    clerkUserId: id,
                    email,
                    role: 'viewer'
                });
            }
        }
    }
  }

  if (eventType === 'user.deleted') {
    // Optionally handle user deletion
    // For safety, we might not want to delete user data entirely
  }

  return new Response('', { status: 200 })
}
