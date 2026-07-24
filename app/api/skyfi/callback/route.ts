import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { SkyfiOAuthProvider } from '@/lib/skyfi/provider';
import { getRedirectUri } from '@/lib/actions/skyfi';
import { db } from '@/lib/db';
import { skyfiOAuthTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No user session found.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state parameters.' }, { status: 400 });
    }

    const redirectUri = await getRedirectUri();
    const provider = new SkyfiOAuthProvider(userId, redirectUri);

    const storedState = await provider.state();
    if (state !== storedState) {
      return NextResponse.json({ error: 'CSRF State mismatch.' }, { status: 400 });
    }

    const clientInfo = await provider.clientInformation();
    const verifier = await provider.codeVerifier();

    if (!clientInfo?.client_id || !verifier) {
      return NextResponse.json({ error: 'Missing client registration or PKCE verifier.' }, { status: 400 });
    }

    console.log('[SkyFiCallback] Exchanging code for tokens with a 10s timeout...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://mcp.skyfi.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientInfo.client_id,
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SkyFiCallback] Token exchange failed:', errorText);
        return NextResponse.json({ error: `Token exchange failed: ${errorText}` }, { status: 500 });
      }

      const data = await response.json();
      console.log('[SkyFiCallback] Code successfully exchanged for tokens.');

      // Save tokens in database
      await provider.saveTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token || undefined,
        expires_at: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
      });

      // Clear temporary state and code verifier
      await db.update(skyfiOAuthTokens)
        .set({
          state: null,
          codeVerifier: null,
          updatedAt: new Date(),
        })
        .where(eq(skyfiOAuthTokens.userId, userId));

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('[SkyFiCallback] Fetch failed or timed out:', fetchError.message);
      return NextResponse.json({ error: `Token exchange failed or timed out: ${fetchError.message}` }, { status: 500 });
    }

    // Redirect user back to the settings page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/settings`);
  } catch (error: any) {
    console.error('[SkyFiCallback] Unexpected error:', error.message);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/settings?error=skyfi_callback_failed`);
  }
}
