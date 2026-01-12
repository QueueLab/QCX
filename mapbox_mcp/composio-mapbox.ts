import { Composio } from '@composio/core';
import { AuthScheme } from '@composio/core';

/**
 * Validate required environment variables
 * @throws Error if any required environment variable is missing
 */
function validateEnvironmentVariables(): {
  authConfigId: string;
  userId: string;
  mapboxToken: string;
  apiKey: string;
} {
  const authConfigId = process.env.COMPOSIO_MAPBOX_AUTH_CONFIG_ID;
  const userId = process.env.COMPOSIO_USER_ID;
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!authConfigId) {
    throw new Error(
      'COMPOSIO_MAPBOX_AUTH_CONFIG_ID environment variable is required. ' +
      'Please set it in your .env.local file.'
    );
  }

  if (!userId) {
    throw new Error(
      'COMPOSIO_USER_ID environment variable is required. ' +
      'Please set it in your .env.local file.'
    );
  }

  if (!mapboxToken) {
    throw new Error(
      'MAPBOX_ACCESS_TOKEN environment variable is required. ' +
      'Please set it in your .env.local file.'
    );
  }

  if (!apiKey) {
    throw new Error(
      'COMPOSIO_API_KEY environment variable is required. ' +
      'Please set it in your .env.local file.'
    );
  }

  return { authConfigId, userId, mapboxToken, apiKey };
}

/**
 * Authenticate Mapbox toolkit using Composio
 * This should only be called server-side to avoid exposing API keys
 * @param userId - User ID from database/application
 * @param authConfigId - Auth config ID for Mapbox
 * @param mapboxApiKey - Mapbox API key (should be retrieved securely)
 * @param composioApiKey - Composio API key for SDK authentication
 * @returns Connection ID
 */
export async function authenticateToolkit(
  userId: string,
  authConfigId: string,
  mapboxApiKey: string,
  composioApiKey: string
): Promise<string> {
  if (!userId || !authConfigId || !mapboxApiKey || !composioApiKey) {
    throw new Error(
      'userId, authConfigId, mapboxApiKey, and composioApiKey are required for authentication'
    );
  }

  // Initialize Composio with API key
  const composio = new Composio({ apiKey: composioApiKey });

  const connectionRequest = await composio.connectedAccounts.initiate(
    userId,
    authConfigId,
    {
      config: AuthScheme.APIKey({
        api_key: mapboxApiKey
      })
    }
  );
  
  // API Key authentication is immediate - no redirect needed
  console.log(`Successfully connected Mapbox for user ${userId}`);
  console.log(`Connection status: ${connectionRequest.status}`);
  
  return connectionRequest.id;
}

/**
 * Initialize Composio connection for Mapbox
 * This should only be called server-side to avoid exposing API keys
 * @throws Error if environment variables are missing or connection fails
 */
export async function initializeComposioMapbox() {
  const { authConfigId, userId, mapboxToken, apiKey } = validateEnvironmentVariables();

  try {
    // Authenticate the toolkit
    const connectionId = await authenticateToolkit(userId, authConfigId, mapboxToken, apiKey);
    
    // Initialize Composio client with API key for subsequent operations
    const composio = new Composio({ apiKey });
    
    // Verify the connection
    const connectedAccount = await composio.connectedAccounts.get(connectionId);
    console.log("Connected account:", connectedAccount);
    
    return { connectionId, connectedAccount, composio };
  } catch (error) {
    console.error("Failed to initialize Composio Mapbox connection:", error);
    throw error;
  }
}

/**
 * Get Composio instance for Mapbox operations
 * Requires COMPOSIO_API_KEY environment variable
 */
export function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'COMPOSIO_API_KEY environment variable is required. ' +
      'Please set it in your .env.local file.'
    );
  }
  
  return new Composio({ apiKey });
}
