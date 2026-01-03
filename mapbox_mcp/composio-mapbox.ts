import { Composio } from '@composio/core';
import { AuthScheme } from '@composio/core';

// Replace these with your actual values
const mapbox_auth_config_id = process.env.COMPOSIO_MAPBOX_AUTH_CONFIG_ID || "ac_YOUR_MAPBOX_CONFIG_ID"; // Auth config ID created above
const userId = process.env.COMPOSIO_USER_ID || "user@example.com"; // User ID from database/application

const composio = new Composio();

/**
 * Authenticate Mapbox toolkit using Composio
 * @param userId - User ID from database/application
 * @param authConfigId - Auth config ID for Mapbox
 * @returns Connection ID
 */
export async function authenticateToolkit(userId: string, authConfigId: string) {
  // TODO: Replace this with a method to retrieve the API key from the user.
  // In production, this should be securely retrieved from your database or user input.
  // For example: const userApiKey = await getUserApiKey(userId);
  const userApiKey = process.env.MAPBOX_ACCESS_TOKEN || "your_mapbox_api_key"; // Replace with actual API key
  
  const connectionRequest = await composio.connectedAccounts.initiate(
    userId,
    authConfigId,
    {
      config: AuthScheme.APIKey({
        api_key: userApiKey
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
 */
export async function initializeComposioMapbox() {
  try {
    // Authenticate the toolkit
    const connectionId = await authenticateToolkit(userId, mapbox_auth_config_id);
    
    // Verify the connection
    const connectedAccount = await composio.connectedAccounts.get(connectionId);
    console.log("Connected account:", connectedAccount);
    
    return { connectionId, connectedAccount };
  } catch (error) {
    console.error("Failed to initialize Composio Mapbox connection:", error);
    throw error;
  }
}

/**
 * Get Composio instance for Mapbox operations
 */
export function getComposioClient() {
  return composio;
}
