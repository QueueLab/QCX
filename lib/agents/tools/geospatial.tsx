/**
 * Fixed geospatial tool with improved error handling and schema
 */
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
import { Client as MCPClientClass } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createSmitheryUrl } from '@smithery/sdk';

export type McpClient = MCPClientClass;

async function getConnectedMcpClient(): Promise<McpClient | null> {
  const apiKey = process.env.NEXT_PUBLIC_SMITHERY_API_KEY;
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const profileId = process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID;

  // Log environment variables (masked for security)
  console.log('[GeospatialTool] Environment check:', {
    apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
    mapboxAccessToken: mapboxAccessToken ? `${mapboxAccessToken.substring(0, 8)}...` : 'MISSING',
    profileId: profileId ? `${profileId.substring(0, 8)}...` : 'MISSING',
  });

  // Validate environment variables
  if (!apiKey || !mapboxAccessToken || !profileId) {
    console.error('[GeospatialTool] Missing required environment variables:', {
      apiKey: !!apiKey,
      mapboxAccessToken: !!mapboxAccessToken,
      profileId: !!profileId,
    });
    return null;
  }

  if (!apiKey.trim() || !mapboxAccessToken.trim() || !profileId.trim()) {
    console.error('[GeospatialTool] Empty environment variables detected');
    return null;
  }

  // Validate profile ID format (basic check for non-empty string with allowed characters)
  const profileIdRegex = /^[a-zA-Z0-9-_]+$/;
  if (!profileIdRegex.test(profileId)) {
    console.error('[GeospatialTool] Invalid profile ID format (must contain only letters, numbers, hyphens, or underscores):', profileId);
    return null;
  }

  // Load configuration
  let config;
  try {
    const mapboxMcpConfig = await import('QCX/mapbox_mcp_config.json');
    config = {
      ...mapboxMcpConfig.default || mapboxMcpConfig,
      mapboxAccessToken,
    };
    console.log('[GeospatialTool] Config loaded successfully');
  } catch (configError: any) {
    console.error('[GeospatialTool] Failed to load mapbox config:', configError.message);
    config = {
      mapboxAccessToken,
      version: '1.0.0',
      name: 'mapbox-mcp-server',
    };
    console.log('[GeospatialTool] Using fallback config');
  }

  // Create Smithery URL with API key and profile ID
  const mcpServerBaseUrl = `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server?api_key=${apiKey}&profile=${profileId}`;
  const smitheryUrlOptions = { config, apiKey, profileId };
  let serverUrlToUse: URL;

  try {
    serverUrlToUse = createSmitheryUrl(mcpServerBaseUrl, smitheryUrlOptions);
    const urlDisplay = serverUrlToUse.toString().split('?')[0];
    console.log('[GeospatialTool] MCP Server URL created:', urlDisplay);

    // Validate URL
    if (!serverUrlToUse.href || !serverUrlToUse.href.startsWith('https://')) {
      throw new Error('Invalid server URL: Must use HTTPS protocol');
    }
  } catch (urlError: any) {
    console.error('[GeospatialTool] Error creating Smithery URL:', urlError.message);
    console.error('[GeospatialTool] URL options:', {
      baseUrl: mcpServerBaseUrl,
      hasConfig: !!config,
      hasApiKey: !!apiKey,
      hasProfileId: !!profileId,
    });
    return null;
  }

  // Initialize transport
  let transport;
  let client;
  try {
    console.log('[GeospatialTool] Initializing transport for:', serverUrlToUse.toString());
    transport = new StreamableHTTPClientTransport(serverUrlToUse);
    console.log('[GeospatialTool] Transport created successfully');
  } catch (transportError: any) {
    console.error('[GeospatialTool] Failed to create transport:', transportError.message);
    return null;
  }

  // Initialize MCP client
  try {
    client = new MCPClientClass({
      name: 'GeospatialToolClient',
      version: '1.0.0',
    });
    console.log('[GeospatialTool] MCP Client instance created');
  } catch (clientError: any) {
    console.error('[GeospatialTool] Failed to create MCP client:', clientError.message);
    return null;
  }

  // Connect to MCP server with timeout
  try {
    console.log('[GeospatialTool] Attempting to connect to MCP server...');

    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000);
      }),
    ]);

    console.log('[GeospatialTool] Successfully connected to MCP server');

    // List available tools for debugging
    try {
      const tools = await client.listTools();
      console.log('[GeospatialTool] Available tools:', tools.tools?.map(t => t.name) || []);
    } catch (listError: any) {
      console.warn('[GeospatialTool] Could not list tools:', listError.message);
    }

    return client;
  } catch (connectionError: any) {
    console.error('[GeospatialTool] MCP connection failed:', connectionError.message);
    console.error('[GeospatialTool] Connection error details:', {
      name: connectionError.name,
      stack: connectionError.stack?.split('\n')[0],
      serverUrl: serverUrlToUse?.toString().split('?')[0],
      httpStatus: connectionError.response?.status,
      httpResponse: connectionError.response?.data,
    });

    // Ensure client is closed on failure
    await closeClient(client);
    return null;
  }
}

async function closeClient(client: MCPClientClass | null) {
  if (!client) return;

  try {
    await Promise.race([
      client.close(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Close timeout after 5 seconds')), 5000);
      }),
    ]);
    console.log('[GeospatialTool] MCP client closed successfully');
  } catch (error: any) {
    console.error('[GeospatialTool] Error closing MCP client:', error.message);
  }
}

export const geospatialTool = ({
  uiStream,
}: {
  uiStream: ReturnType<typeof createStreamableUI>;
}) => ({
  description: `Use this tool for location-based queries including:
- Finding specific places, addresses, or landmarks
- Getting coordinates for locations
- Distance calculations between places
- Direction queries
- Map-related requests
- Geographic information lookup`,
  parameters: geospatialQuerySchema,
  execute: async ({ query, queryType, includeMap }: {
    query:
