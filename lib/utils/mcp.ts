import { Client as MCPClientClass } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Types
export type McpClient = MCPClientClass;

/**
 * Establish connection to the MCP server with proper environment validation.
 */
export async function getConnectedMcpClient(): Promise<McpClient | null> {
  const composioApiKey = process.env.COMPOSIO_API_KEY;
  const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;
  const composioUserId = process.env.COMPOSIO_USER_ID;

  console.log('[MCP Utility] Environment check:', {
    composioApiKey: composioApiKey ? `${composioApiKey.substring(0, 8)}...` : 'MISSING',
    mapboxAccessToken: mapboxAccessToken ? `${mapboxAccessToken.substring(0, 8)}...` : 'MISSING',
    composioUserId: composioUserId ? `${composioUserId.substring(0, 8)}...` : 'MISSING',
  });

  if (!composioApiKey || !mapboxAccessToken || !composioUserId || !composioApiKey.trim() || !mapboxAccessToken.trim() || !composioUserId.trim()) {
    console.error('[MCP Utility] Missing or empty required environment variables');
    return null;
  }

  // Build Composio MCP server URL
  let serverUrlToUse: URL;
  try {
    const baseUrl = 'https://api.composio.dev/v1/mcp/mapbox';
    serverUrlToUse = new URL(baseUrl);
    serverUrlToUse.searchParams.set('api_key', composioApiKey);
    serverUrlToUse.searchParams.set('user_id', composioUserId);

    const urlDisplay = serverUrlToUse.toString().split('?')[0];
    console.log('[MCP Utility] Composio MCP Server URL created:', urlDisplay);

    if (!serverUrlToUse.href || !serverUrlToUse.href.startsWith('https://')) {
      throw new Error('Invalid server URL generated');
    }
  } catch (urlError: any) {
    console.error('[MCP Utility] Error creating Composio URL:', urlError.message);
    return null;
  }

  // Create transport
  let transport;
  try {
    transport = new StreamableHTTPClientTransport(serverUrlToUse);
    console.log('[MCP Utility] Transport created successfully');
  } catch (transportError: any) {
    console.error('[MCP Utility] Failed to create transport:', transportError.message);
    return null;
  }

  // Create client
  let client;
  try {
    client = new MCPClientClass({ name: 'SharedMcpClient', version: '1.0.0' });
    console.log('[MCP Utility] MCP Client instance created');
  } catch (clientError: any) {
    console.error('[MCP Utility] Failed to create MCP client:', clientError.message);
    return null;
  }

  // Connect to server
  try {
    console.log('[MCP Utility] Attempting to connect to MCP server...');
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)),
    ]);
    console.log('[MCP Utility] Successfully connected to MCP server');
  } catch (connectError: any) {
    console.error('[MCP Utility] MCP connection failed:', connectError.message);
    return null;
  }

  return client;
}

/**
 * Safely close the MCP client with timeout.
 */
export async function closeClient(client: McpClient | null) {
  if (!client) return;
  try {
    await Promise.race([
      client.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout after 5 seconds')), 5000)),
    ]);
    console.log('[MCP Utility] MCP client closed successfully');
  } catch (error: any) {
    console.error('[MCP Utility] Error closing MCP client:', error.message);
  }
}
