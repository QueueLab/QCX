import { OAuthClientProvider, OAuthClientMetadata, OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/dist/esm/client/auth.js';
import { db } from '@/lib/db';
import { skyfiOAuthTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class SkyfiOAuthProvider implements OAuthClientProvider {
  private userId: string;
  private redirectUrlStr: string;

  constructor(userId: string, redirectUrl: string) {
    this.userId = userId;
    this.redirectUrlStr = redirectUrl;
  }

  get redirectUrl(): string | URL | undefined {
    return this.redirectUrlStr;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'QCX Planetary Copilot',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client with PKCE
      redirect_uris: [this.redirectUrlStr],
    };
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const [row] = await db.select()
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    if (row && row.clientId) {
      return {
        client_id: row.clientId,
        client_secret: row.clientSecret || undefined,
        registration_client_uri: '',
        registration_access_token: '',
      } as any;
    }
    return undefined;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
    const [existing] = await db.select({ id: skyfiOAuthTokens.id })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    if (existing) {
      await db.update(skyfiOAuthTokens)
        .set({
          clientId: clientInformation.client_id,
          clientSecret: clientInformation.client_secret || null,
          updatedAt: new Date(),
        })
        .where(eq(skyfiOAuthTokens.id, existing.id));
    } else {
      await db.insert(skyfiOAuthTokens)
        .values({
          userId: this.userId,
          clientId: clientInformation.client_id,
          clientSecret: clientInformation.client_secret || null,
        });
    }
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const [row] = await db.select()
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    if (row && row.accessToken) {
      return {
        access_token: row.accessToken,
        refresh_token: row.refreshToken || undefined,
        expires_at: row.tokenExpiry ? Math.floor(row.tokenExpiry.getTime() / 1000) : undefined,
      };
    }
    return undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const [existing] = await db.select({ id: skyfiOAuthTokens.id })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    const tokenExpiryDate = tokens.expires_at ? new Date(tokens.expires_at * 1000) : null;

    if (existing) {
      await db.update(skyfiOAuthTokens)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry: tokenExpiryDate,
          updatedAt: new Date(),
        })
        .where(eq(skyfiOAuthTokens.id, existing.id));
    } else {
      await db.insert(skyfiOAuthTokens)
        .values({
          userId: this.userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry: tokenExpiryDate,
        });
    }
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const [existing] = await db.select({ id: skyfiOAuthTokens.id })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    if (existing) {
      await db.update(skyfiOAuthTokens)
        .set({
          codeVerifier,
          updatedAt: new Date(),
        })
        .where(eq(skyfiOAuthTokens.id, existing.id));
    } else {
      await db.insert(skyfiOAuthTokens)
        .values({
          userId: this.userId,
          codeVerifier,
        });
    }
  }

  async codeVerifier(): Promise<string> {
    const [row] = await db.select({ codeVerifier: skyfiOAuthTokens.codeVerifier })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    return row?.codeVerifier || '';
  }

  async saveState(state: string): Promise<void> {
    const [existing] = await db.select({ id: skyfiOAuthTokens.id })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    if (existing) {
      await db.update(skyfiOAuthTokens)
        .set({
          state,
          updatedAt: new Date(),
        })
        .where(eq(skyfiOAuthTokens.id, existing.id));
    } else {
      await db.insert(skyfiOAuthTokens)
        .values({
          userId: this.userId,
          state,
        });
    }
  }

  async state(): Promise<string> {
    const [row] = await db.select({ state: skyfiOAuthTokens.state })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    return row?.state || '';
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    // This is called internally, handled transiently on connection.
  }
}
