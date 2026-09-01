'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { skyfiOAuthTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { SkyfiOAuthProvider } from '@/lib/skyfi/provider';
import crypto from 'crypto';

import { headers } from 'next/headers';

import { getClerkUserIdOnServer, resolveClerkUserToDbUser } from '@/lib/auth/get-current-user';

export async function getRedirectUri(): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (baseUrl) {
    return `${baseUrl}/api/skyfi/callback`;
  }
  try {
    const headersList = await headers();
    const forwardedProto = headersList.get('x-forwarded-proto');
    const forwardedHost = headersList.get('x-forwarded-host');
    const host = headersList.get('host');

    const finalHost = forwardedHost || host;
    if (finalHost) {
      let finalProto = forwardedProto;
      if (!finalProto) {
        finalProto = finalHost.startsWith('localhost') || finalHost.startsWith('127.0.0.1') || finalHost.startsWith('3000') || finalHost.startsWith('3001') ? 'http' : 'https';
      }
      return `${finalProto}://${finalHost}/api/skyfi/callback`;
    }
  } catch (e) {
    console.warn('[Skyfi] Failed to get host from headers:', e);
  }
  return 'http://localhost:3000/api/skyfi/callback';
}

/**
 * Ensures the client is registered dynamically with the SkyFi MCP server.
 * Uses an AbortController with a 10s timeout to prevent hanging.
 */
async function ensureClientRegistered(provider: SkyfiOAuthProvider, forceRegister: boolean = false): Promise<string> {
  const currentInfo = await provider.clientInformation();
  const currentRedirectUri = provider.redirectUrl?.toString();

  if (!forceRegister && currentInfo?.client_id && currentInfo?.redirect_uri === currentRedirectUri) {
    return currentInfo.client_id;
  }

  console.log('[SkyFiAction] Client not registered or force-register active. Registering dynamically...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://mcp.skyfi.com/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'QCX Planetary Copilot',
        redirect_uris: [currentRedirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Dynamic Client Registration failed: ${await res.text()}`);
    }

    const data = await res.json();
    if (!data || !data.client_id) {
      throw new Error('Dynamic Client Registration response did not contain a valid client_id.');
    }

    await provider.saveClientInformation({
      client_id: data.client_id,
      client_secret: data.client_secret || null,
      registration_client_uri: data.registration_client_uri || null,
      registration_access_token: data.registration_access_token || null,
      redirect_uri: currentRedirectUri,
    } as any);

    return data.client_id;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Starts the SkyFi OAuth connection flow.
 * Performs DCR, generates PKCE, and returns the authorization URL.
 */
export async function startSkyfiConnection(): Promise<{ url?: string; error?: string; authRequired?: boolean }> {
  let userId: string | null = null;
  try {
    const clerkUserId = await getClerkUserIdOnServer();
    if (!clerkUserId) {
      return { authRequired: true, error: 'Please sign in to connect your SkyFi account.' };
    }
    userId = await resolveClerkUserToDbUser(clerkUserId);
    if (!userId) {
      return { error: 'Authentication service error: Database resolution failed to return a valid user ID.' };
    }
  } catch (authError: any) {
    console.error('[SkyFiAction: startSkyfiConnection] Auth error:', authError);
    return { error: `Authentication service error: ${authError.message}` };
  }

  try {
    const redirectUri = await getRedirectUri();
    const provider = new SkyfiOAuthProvider(userId, redirectUri);

    const clientId = await ensureClientRegistered(provider, false);

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
    const isTimeout = error.name === 'AbortError' || error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('aborted');
    const isNetwork = error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('failed to fetch');

    if (isTimeout) {
      return { error: 'SkyFi Connection Error: Dynamic client registration request timed out.' };
    } else if (isNetwork) {
      return { error: 'SkyFi Connection Error: Network failure. Please check your connection to SkyFi services.' };
    }
    return { error: `SkyFi Registration/Connection failed: ${error.message}` };
  }
}

/**
 * Returns whether a valid SkyFi connection exists for the current user.
 * Uses an AbortController with a 10s timeout to prevent hanging.
 */
export async function getSkyfiConnectionStatus(): Promise<{ connected: boolean; email?: string; budget?: string; expired?: boolean; missing?: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return { connected: false, missing: true };
    }

    const [row] = await db.select()
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, userId))
      .limit(1);

    if (!row || !row.clientId) {
      return { connected: false, missing: true };
    }

    const redirectUri = await getRedirectUri();
    const provider = new SkyfiOAuthProvider(userId, redirectUri);
    let tokens;
    try {
      tokens = await provider.tokens();
    } catch (tokenErr: any) {
      console.warn('[SkyFiAction: getSkyfiConnectionStatus] Failed to retrieve tokens:', tokenErr);
      return { connected: false, expired: true, error: tokenErr.message };
    }

    if (!tokens || !tokens.access_token) {
      return { connected: false, expired: true };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Try a simple whoami call to verify token validity and get email/budget
      const res = await fetch('https://mcp.skyfi.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access_token}`,
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        return { connected: false, expired: true };
      }

      if (res.ok) {
        const data = await res.json();
        const content = data?.result?.content?.[0]?.text || '';
        return { connected: true, budget: content };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.warn('[SkyFiAction: getSkyfiConnectionStatus] Failed to query whoami:', fetchError);
    }

    return { connected: true };
  } catch (error: any) {
    console.error('[SkyFiAction: getSkyfiConnectionStatus] Error:', error.message);
    return { connected: false, error: error.message };
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

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
