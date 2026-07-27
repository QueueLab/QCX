import { db } from '@/lib/db';
import { skyfiOAuthTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/utils/encryption';

export interface OAuthClientMetadata {
  client_name?: string;
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  redirect_uris?: string[];
  [key: string]: any;
}

export interface OAuthClientInformationMixed {
  client_id: string;
  client_secret?: string;
  registration_client_uri?: string;
  registration_access_token?: string;
  [key: string]: any;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  [key: string]: any;
}

export interface OAuthClientProvider {
  redirectUrl: string | URL | undefined;
  clientMetadataUrl?: string;
  clientMetadata: OAuthClientMetadata;
  state?(): string | Promise<string>;
  clientInformation(): OAuthClientInformationMixed | undefined | Promise<OAuthClientInformationMixed | undefined>;
  saveClientInformation?(clientInformation: OAuthClientInformationMixed): void | Promise<void>;
  tokens(): OAuthTokens | undefined | Promise<OAuthTokens | undefined>;
  saveTokens(tokens: OAuthTokens): void | Promise<void>;
  redirectToAuthorization(authorizationUrl: URL): void | Promise<void>;
  saveCodeVerifier(codeVerifier: string): void | Promise<void>;
  codeVerifier(): string | Promise<string>;
}

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

  async clientInformation(): Promise<OAuthClientInformationMixed & { redirect_uri?: string } | undefined> {
    const [row] = await db.select()
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    if (row && row.clientId) {
      return {
        client_id: row.clientId,
        client_secret: decrypt(row.clientSecret) || undefined,
        registration_client_uri: row.registrationClientUri || undefined,
        registration_access_token: decrypt(row.registrationAccessToken) || undefined,
        redirect_uri: row.redirectUri || undefined,
      };
    }
    return undefined;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed & { redirect_uri?: string }): Promise<void> {
    await db.insert(skyfiOAuthTokens)
      .values({
        userId: this.userId,
        clientId: clientInformation.client_id,
        clientSecret: encrypt(clientInformation.client_secret || null),
        registrationClientUri: clientInformation.registration_client_uri || null,
        registrationAccessToken: encrypt(clientInformation.registration_access_token || null),
        redirectUri: clientInformation.redirect_uri || null,
      })
      .onConflictDoUpdate({
        target: skyfiOAuthTokens.userId,
        set: {
          clientId: clientInformation.client_id,
          clientSecret: encrypt(clientInformation.client_secret || null),
          registrationClientUri: clientInformation.registration_client_uri || null,
          registrationAccessToken: encrypt(clientInformation.registration_access_token || null),
          redirectUri: clientInformation.redirect_uri || null,
          updatedAt: new Date(),
        }
      });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const [row] = await db.select()
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    if (!row || !row.accessToken) {
      return undefined;
    }

    const decryptedAccessToken = decrypt(row.accessToken);
    const decryptedRefreshToken = decrypt(row.refreshToken);

    if (!decryptedAccessToken) {
      return undefined;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = row.tokenExpiry ? Math.floor(row.tokenExpiry.getTime() / 1000) : null;

    // Check if token is expired, expiring in less than 60 seconds, or missing expiry entirely (conservative treatment)
    const isExpiredOrMissingExpiry = !expiresAt || (expiresAt < nowSeconds + 60);

    if (isExpiredOrMissingExpiry && decryptedRefreshToken && row.clientId) {
      console.log('[SkyfiProvider] Token expired, expiring soon, or missing expiry. Refreshing token...');
      try {
        const response = await fetch('https://mcp.skyfi.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: row.clientId,
            refresh_token: decryptedRefreshToken,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[SkyfiProvider] Token successfully refreshed.');
          const newTokens: OAuthTokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || decryptedRefreshToken,
            expires_at: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
          };
          await this.saveTokens(newTokens);
          return newTokens;
        } else {
          console.error('[SkyfiProvider] Failed to refresh token:', await response.text());
        }
      } catch (err: any) {
        console.error('[SkyfiProvider] Error refreshing token:', err.message);
      }
    }

    return {
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken || undefined,
      expires_at: expiresAt || undefined,
    };
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const tokenExpiryDate = tokens.expires_at ? new Date(tokens.expires_at * 1000) : null;

    await db.insert(skyfiOAuthTokens)
      .values({
        userId: this.userId,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token || null),
        tokenExpiry: tokenExpiryDate,
      })
      .onConflictDoUpdate({
        target: skyfiOAuthTokens.userId,
        set: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token || null),
          tokenExpiry: tokenExpiryDate,
          updatedAt: new Date(),
        }
      });
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await db.insert(skyfiOAuthTokens)
      .values({
        userId: this.userId,
        codeVerifier,
      })
      .onConflictDoUpdate({
        target: skyfiOAuthTokens.userId,
        set: {
          codeVerifier,
          updatedAt: new Date(),
        }
      });
  }

  async codeVerifier(): Promise<string> {
    const [row] = await db.select({ codeVerifier: skyfiOAuthTokens.codeVerifier })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    return row?.codeVerifier || '';
  }

  async saveState(state: string): Promise<void> {
    await db.insert(skyfiOAuthTokens)
      .values({
        userId: this.userId,
        state,
      })
      .onConflictDoUpdate({
        target: skyfiOAuthTokens.userId,
        set: {
          state,
          updatedAt: new Date(),
        }
      });
  }

  async state(): Promise<string> {
    const [row] = await db.select({ state: skyfiOAuthTokens.state })
      .from(skyfiOAuthTokens)
      .where(eq(skyfiOAuthTokens.userId, this.userId))
      .limit(1);

    return row?.state || '';
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    // Handled transiently
  }
}
