import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { SkyfiOAuthProvider } from '@/lib/skyfi/provider';
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/skyfi/callback`;
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

    console.log('[SkyFiCallback] Exchanging code for tokens...');
    // Exchange the authorization code for tokens
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
    });

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

    // Redirect user back to the settings page
    return NextResponse.redirect(`${baseUrl}/settings`);
  } catch (error: any) {
    console.error('[SkyFiCallback] Unexpected error:', error.message);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/settings?error=skyfi_callback_failed`);
  }
}
