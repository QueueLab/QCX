'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { skyfiOAuthTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { SkyfiOAuthProvider } from '@/lib/skyfi/provider';
import crypto from 'crypto';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function getRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/skyfi/callback`;
}

/**
 * Ensures the client is registered dynamically with the SkyFi MCP server.
 */
async function ensureClientRegistered(provider: SkyfiOAuthProvider): Promise<string> {
  const currentInfo = await provider.clientInformation();
  if (currentInfo?.client_id) {
    return currentInfo.client_id;
  }

  console.log('[SkyFiAction] Client not registered. Registering dynamically...');
  const res = await fetch('https://mcp.skyfi.com/oauth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'QCX Planetary Copilot',
      redirect_uris: [provider.redirectUrl?.toString()],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });

  if (!res.ok) {
    throw new Error(`Dynamic Client Registration failed: ${await res.text()}`);
  }

  const data = await res.json();
  await provider.saveClientInformation({
    client_id: data.client_id,
    client_secret: data.client_secret || null,
  } as any);

  return data.client_id;
}

/**
 * Starts the SkyFi OAuth connection flow.
 * Performs DCR, generates PKCE, and returns the authorization URL.
 */
export async function startSkyfiConnection(): Promise<{ url?: string; error?: string }> {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return { error: 'Unauthorized: User not authenticated.' };
    }

    const redirectUri = getRedirectUri();
    const provider = new SkyfiOAuthProvider(userId, redirectUri);

    const clientId = await ensureClientRegistered(provider);

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const state = crypto.randomBytes(16).toString('hex');

    await provider.saveCodeVerifier(verifier);
    await provider.saveState(state);

    const authorizeUrl = new URL('https://mcp.skyfi.com/oauth/authorize');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('scope', 'skyfi:read skyfi:write skyfi:order');

    return { url: authorizeUrl.toString() };
  } catch (error: any) {
    console.error('[SkyFiAction: startSkyfiConnection] Error:', error.message);
    return { error: error.message || 'Failed to start SkyFi connection.' };
  }
}

/**
 * Returns whether a valid SkyFi connection exists for the current user.
 */
export async function getSkyfiConnectionStatus(): Promise<{ connected: boolean; email?: string; budget?: string }> {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return { connected: false };
    }

    const redirectUri = getRedirectUri();
    const provider = new SkyfiOAuthProvider(userId, redirectUri);
    const tokens = await provider.tokens();

    if (!tokens || !tokens.access_token) {
      return { connected: false };
    }

    // Try a simple whoami call to verify token validity and get email/budget
    const res = await fetch('https://mcp.skyfi.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Skyfi-Api-Key': tokens.access_token,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'skyfi_whoami',
          arguments: {},
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data?.result?.content?.[0]?.text || '';
      return { connected: true, budget: content };
    }

    return { connected: true };
  } catch (error: any) {
    console.error('[SkyFiAction: getSkyfiConnectionStatus] Error:', error.message);
    return { connected: false };
  }
}

/**
 * Disconnects the user's SkyFi account by removing token storage.
 */
export async function disconnectSkyfi(): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return { success: false, error: 'Unauthorized: User not authenticated.' };
    }

    await db.delete(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, userId));

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error('[SkyFiAction: disconnectSkyfi] Error:', error.message);
    return { success: false, error: error.message || 'Failed to disconnect SkyFi.' };
  }
}
