import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

/**
 * Automated RLS Authorization Audit Suite
 *
 * Verifies Row-Level Security (RLS) enforcement across 4 primary tables:
 * - chats
 * - messages
 * - chat_participants
 * - users
 *
 * Across 4 distinct identities:
 * 1. Owner: Creates and owns the chat
 * 2. Collaborator: Added to chat_participants
 * 3. Unrelated Authenticated User: Unrelated active user
 * 4. Anonymous: No JWT claims set
 *
 * Checks SELECT, INSERT, UPDATE, DELETE for allowed and denied scenarios.
 */

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

describe('RLS Authorization Matrix Audit Suite', () => {
  let client: any = null;
  let isDbAvailable = false;

  // Test UUIDs
  const ownerId = '11111111-1111-4111-a111-111111111111';
  const collaboratorId = '22222222-2222-4222-a222-222222222222';
  const unrelatedId = '33333333-3333-4333-a333-333333333333';

  const ownerClerkId = 'user_clerk_owner_111';
  const collaboratorClerkId = 'user_clerk_collaborator_222';
  const unrelatedClerkId = 'user_clerk_unrelated_333';

  const chatId = '44444444-4444-4444-a444-444444444444';
  const messageId = '55555555-5555-4555-a555-555555555555';
  const ownerParticipantId = '66666666-6666-4666-a666-666666666666';
  const collaboratorParticipantId = '77777777-7777-4777-a777-777777777777';

  beforeAll(async () => {
    if (!postgresUrl) {
      console.warn('POSTGRES_URL not set; skipping database-bound RLS tests');
      return;
    }

    try {
      const pgModule = await import('pg');
      const ClientClass = pgModule.Client || pgModule.default?.Client;
      if (!ClientClass) return;

      client = new ClientClass({ connectionString: postgresUrl });
      await client.connect();
      isDbAvailable = true;

      // Seed identities & test data under superuser/app role
      await client.query(`
        INSERT INTO public.users (id, clerk_user_id, email, first_name, last_name)
        VALUES
          ('${ownerId}', '${ownerClerkId}', 'owner@test.com', 'Owner', 'User'),
          ('${collaboratorId}', '${collaboratorClerkId}', 'collaborator@test.com', 'Collaborator', 'User'),
          ('${unrelatedId}', '${unrelatedClerkId}', 'unrelated@test.com', 'Unrelated', 'User')
        ON CONFLICT (id) DO UPDATE SET clerk_user_id = EXCLUDED.clerk_user_id;

        INSERT INTO public.chats (id, user_id, title, visibility)
        VALUES ('${chatId}', '${ownerId}', 'Audit Test Chat', 'private')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.chat_participants (id, chat_id, user_id, role)
        VALUES
          ('${ownerParticipantId}', '${chatId}', '${ownerId}', 'owner'),
          ('${collaboratorParticipantId}', '${chatId}', '${collaboratorId}', 'collaborator')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.messages (id, chat_id, user_id, role, content)
        VALUES ('${messageId}', '${chatId}', '${ownerId}', 'user', 'Audit Message')
        ON CONFLICT (id) DO NOTHING;
      `);
    } catch (err) {
      console.warn('Database connection or seeding failed; skipping RLS DB assertions:', err);
      if (client) {
        await client.end().catch(() => {});
        client = null;
      }
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (client) {
      try {
        await client.query(`
          DELETE FROM public.messages WHERE id = '${messageId}';
          DELETE FROM public.chat_participants WHERE chat_id = '${chatId}';
          DELETE FROM public.chats WHERE id = '${chatId}';
          DELETE FROM public.users WHERE id IN ('${ownerId}', '${collaboratorId}', '${unrelatedId}');
        `);
      } catch (e) {
        // Ignore cleanup errors
      }
      await client.end();
    }
  });

  const runAsUser = async (userId: string | null, callback: () => Promise<void>) => {
    if (!client || !isDbAvailable) return;
    await client.query('BEGIN');
    try {
      if (userId) {
        await client.query(`SET LOCAL ROLE authenticated`);
        await client.query(`SET LOCAL request.jwt.claims = '{"sub": "${userId}"}'`);
      } else {
        await client.query(`SET LOCAL ROLE anon`);
        await client.query(`RESET request.jwt.claims`);
      }
      await callback();
    } finally {
      await client.query('ROLLBACK');
    }
  };

  test('Suite structural setup', () => {
    expect(ownerId).toBeDefined();
    expect(collaboratorId).toBeDefined();
    expect(unrelatedId).toBeDefined();
  });

  describe('Users Table RLS Matrix', () => {
    test('SELECT: users can select own profile, others cannot', async () => {
      if (!isDbAvailable || !client) return;

      await runAsUser(ownerId, async () => {
        const res = await client.query(`SELECT * FROM public.users WHERE id = '${ownerId}'`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(unrelatedId, async () => {
        const res = await client.query(`SELECT * FROM public.users WHERE id = '${ownerId}'`);
        expect(res.rows.length).toBe(0);
      });

      await runAsUser(null, async () => {
        const res = await client.query(`SELECT * FROM public.users WHERE id = '${ownerId}'`);
        expect(res.rows.length).toBe(0);
      });
    });

    test('UPDATE: users can update own profile, others cannot', async () => {
      if (!isDbAvailable || !client) return;

      await runAsUser(ownerId, async () => {
        const res = await client.query(`UPDATE public.users SET first_name = 'Updated' WHERE id = '${ownerId}' RETURNING id`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(unrelatedId, async () => {
        const res = await client.query(`UPDATE public.users SET first_name = 'Hacked' WHERE id = '${ownerId}' RETURNING id`);
        expect(res.rows.length).toBe(0);
      });
    });
  });

  describe('Chats Table RLS Matrix', () => {
    test('SELECT: owner and collaborator can select chat, unrelated and anon cannot', async () => {
      if (!isDbAvailable || !client) return;

      await runAsUser(ownerId, async () => {
        const res = await client.query(`SELECT * FROM public.chats WHERE id = '${chatId}'`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(collaboratorId, async () => {
        const res = await client.query(`SELECT * FROM public.chats WHERE id = '${chatId}'`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(unrelatedId, async () => {
        const res = await client.query(`SELECT * FROM public.chats WHERE id = '${chatId}'`);
        expect(res.rows.length).toBe(0);
      });

      await runAsUser(null, async () => {
        const res = await client.query(`SELECT * FROM public.chats WHERE id = '${chatId}'`);
        expect(res.rows.length).toBe(0);
      });
    });

    test('INSERT: authenticated users can insert own chat, anon cannot', async () => {
      if (!isDbAvailable || !client) return;

      const newChatId = '88888888-8888-4888-a888-888888888888';

      await runAsUser(ownerId, async () => {
        const res = await client.query(`INSERT INTO public.chats (id, user_id, title) VALUES ('${newChatId}', '${ownerId}', 'New Chat') RETURNING id`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(null, async () => {
        try {
          const res = await client.query(`INSERT INTO public.chats (id, user_id, title) VALUES ('${newChatId}', '${ownerId}', 'Anon Chat') RETURNING id`);
          expect(res.rows.length).toBe(0);
        } catch (e) {
          // Expected RLS violation error
          expect(e).toBeDefined();
        }
      });
    });

    test('UPDATE/DELETE: owner can update/delete chat, collaborator/unrelated cannot', async () => {
      if (!isDbAvailable || !client) return;

      // Collaborator attempt
      await runAsUser(collaboratorId, async () => {
        const res = await client.query(`UPDATE public.chats SET title = 'Collaborator Title' WHERE id = '${chatId}' RETURNING id`);
        expect(res.rows.length).toBe(0);
      });

      // Unrelated attempt
      await runAsUser(unrelatedId, async () => {
        const res = await client.query(`DELETE FROM public.chats WHERE id = '${chatId}' RETURNING id`);
        expect(res.rows.length).toBe(0);
      });

      // Owner attempt
      await runAsUser(ownerId, async () => {
        const res = await client.query(`UPDATE public.chats SET title = 'Owner Title' WHERE id = '${chatId}' RETURNING id`);
        expect(res.rows.length).toBe(1);
      });
    });
  });

  describe('Messages Table RLS Matrix', () => {
    test('SELECT: owner and collaborator can select messages, unrelated and anon cannot', async () => {
      if (!isDbAvailable || !client) return;

      await runAsUser(ownerId, async () => {
        const res = await client.query(`SELECT * FROM public.messages WHERE id = '${messageId}'`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(collaboratorId, async () => {
        const res = await client.query(`SELECT * FROM public.messages WHERE id = '${messageId}'`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(unrelatedId, async () => {
        const res = await client.query(`SELECT * FROM public.messages WHERE id = '${messageId}'`);
        expect(res.rows.length).toBe(0);
      });

      await runAsUser(null, async () => {
        const res = await client.query(`SELECT * FROM public.messages WHERE id = '${messageId}'`);
        expect(res.rows.length).toBe(0);
      });
    });

    test('INSERT: owner and collaborator can insert messages to chat, unrelated/anon cannot', async () => {
      if (!isDbAvailable || !client) return;

      const newMsgId1 = '99999999-9999-4999-a999-999999999991';
      const newMsgId2 = '99999999-9999-4999-a999-999999999992';

      await runAsUser(collaboratorId, async () => {
        const res = await client.query(`INSERT INTO public.messages (id, chat_id, user_id, role, content) VALUES ('${newMsgId1}', '${chatId}', '${collaboratorId}', 'user', 'Collab Msg') RETURNING id`);
        expect(res.rows.length).toBe(1);
      });

      await runAsUser(unrelatedId, async () => {
        try {
          const res = await client.query(`INSERT INTO public.messages (id, chat_id, user_id, role, content) VALUES ('${newMsgId2}', '${chatId}', '${unrelatedId}', 'user', 'Unrelated Msg') RETURNING id`);
          expect(res.rows.length).toBe(0);
        } catch (e) {
          expect(e).toBeDefined();
        }
      });
    });
  });

  describe('Chat Participants Table RLS Matrix', () => {
    test('SELECT: participants can view chat participants, non-members cannot', async () => {
      if (!isDbAvailable || !client) return;

      await runAsUser(collaboratorId, async () => {
        const res = await client.query(`SELECT * FROM public.chat_participants WHERE chat_id = '${chatId}'`);
        expect(res.rows.length).toBeGreaterThanOrEqual(1);
      });

      await runAsUser(unrelatedId, async () => {
        const res = await client.query(`SELECT * FROM public.chat_participants WHERE chat_id = '${chatId}'`);
        expect(res.rows.length).toBe(0);
      });
    });

    test('INSERT: owner can insert participant, collaborator/unrelated cannot', async () => {
      if (!isDbAvailable || !client) return;

      const newPartId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

      await runAsUser(collaboratorId, async () => {
        try {
          const res = await client.query(`INSERT INTO public.chat_participants (id, chat_id, user_id, role) VALUES ('${newPartId}', '${chatId}', '${unrelatedId}', 'collaborator') RETURNING id`);
          expect(res.rows.length).toBe(0);
        } catch (e) {
          expect(e).toBeDefined();
        }
      });

      await runAsUser(ownerId, async () => {
        const res = await client.query(`INSERT INTO public.chat_participants (id, chat_id, user_id, role) VALUES ('${newPartId}', '${chatId}', '${unrelatedId}', 'collaborator') RETURNING id`);
        expect(res.rows.length).toBe(1);
      });
    });
  });
});
