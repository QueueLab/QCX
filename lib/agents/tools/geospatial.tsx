/**
 * Fixed geospatial tool with improved error handling and schema
 */
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
import { Client as MCPClientClass } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createSmitheryUrl } from '@smithery/sdk';
import { z } from 'zod';

// Types
export type McpClient = MCPClientClass;

interface Location {
  latitude?: number;
  longitude?: number;
  place_name?: string;
  address?: string;
}

interface McpResponse {
  location: Location;
  mapUrl?: string;
}

interface MapboxConfig {
  mapboxAccessToken: string;
  version: string;
  name: string;
}

/**
 * Establish connection to the MCP server with proper environment validation.
 */
async function getConnectedMcpClient(): Promise<McpClient | null> {
  const apiKey = process.env.NEXT_PUBLIC_SMITHERY_API_KEY;
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const profileId = process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID;

  console.log('[GeospatialTool] Environment check:', {
    apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
    mapboxAccessToken: mapboxAccessToken ? `${mapboxAccessToken.substring(0, 8)}...` : 'MISSING',
    profileId: profileId ? `${profileId.substring(0, 8)}...` : 'MISSING',
  });

  if (!apiKey || !mapboxAccessToken || !profileId || !apiKey.trim() || !mapboxAccessToken.trim() || !profileId.trim()) {
    console.error('[GeospatialTool] Missing or empty required environment variables');
    return null;
  }

  // Load config from file or fallback
  let config;
  try {
    const mapboxMcpConfig = await import('QCX/mapbox_mcp_config.json');
    config = { ...mapboxMcpConfig.default || mapboxMcpConfig, mapboxAccessToken };
    console.log('[GeospatialTool] Config loaded successfully');
  } catch (configError: any) {
    console.error('[GeospatialTool] Failed to load mapbox config:', configError.message);
    config = { mapboxAccessToken, version: '1.0.0', name: 'mapbox-mcp-server' };
    console.log('[GeospatialTool] Using fallback config');
  }

  // Build Smithery URL
  const smitheryUrlOptions = { config, apiKey, profileId };
  const mcpServerBaseUrl = `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server/mcp?api_key=${smitheryUrlOptions.apiKey}&profile=${smitheryUrlOptions.profileId}`;
  let serverUrlToUse;
  try {
    serverUrlToUse = createSmitheryUrl(mcpServerBaseUrl, smitheryUrlOptions);
    const urlDisplay = serverUrlToUse.toString().split('?')[0];
    console.log('[GeospatialTool] MCP Server URL created:', urlDisplay);

    if (!serverUrlToUse.href || !serverUrlToUse.href.startsWith('https://')) {
      throw new Error('Invalid server URL generated');
    }
  } catch (urlError: any) {
    console.error('[GeospatialTool] Error creating Smithery URL:', urlError.message);
    return null;
  }

  // Create transport
  let transport;
  try {
    transport = new StreamableHTTPClientTransport(serverUrlToUse);
    console.log('[GeospatialTool] Transport created successfully');
  } catch (transportError: any) {
    console.error('[GeospatialTool] Failed to create transport:', transportError.message);
    return null;
  }

  // Create client
  let client;
  try {
    client = new MCPClientClass({ name: 'GeospatialToolClient', version: '1.0.0' });
    console.log('[GeospatialTool] MCP Client instance created');
  } catch (clientError: any) {
    console.error('[GeospatialTool] Failed to create MCP client:', clientError.message);
    return null;
  }

  // Connect to server
  try {
    console.log('[GeospatialTool] Attempting to connect to MCP server...');
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)),
    ]);
    console.log('[GeospatialTool] Successfully connected to MCP server');
  } catch (connectError: any) {
    console.error('[GeospatialTool] MCP connection failed:', connectError.message);
    return null;
  }

  // List tools
  try {
    const tools = await client.listTools();
    console.log('[GeospatialTool] Available tools:', tools.tools?.map(t => t.name) || []);
  } catch (listError: any) {
    console.warn('[GeospatialTool] Could not list tools:', listError.message);
  }

  return client;
}

/**
 * Safely close the MCP client with timeout.
 */
async function closeClient(client: McpClient | null) {
  if (!client) return;
  try {
    await Promise.race([
      client.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout after 5 seconds')), 5000)),
    ]);
    console.log('[GeospatialTool] MCP client closed successfully');
  } catch (error: any) {
    console.error('[GeospatialTool] Error closing MCP client:', error.message);
  }
}

/**
 * Main geospatial tool executor.
 */
export const geospatialTool = ({ uiStream }: { uiStream: ReturnType<typeof createStreamableUI> }) => ({
  description: `Use this tool for location-based queries including:
- Finding specific places, addresses, or landmarks
- Getting coordinates for locations
- Distance calculations between places
- Direction queries
- Map-related requests
- Geographic information lookup`,
  parameters: geospatialQuerySchema,
  execute: async (params: z.infer<typeof geospatialQuerySchema>) => {
    const { queryType, includeMap = true } = params;
    console.log('[GeospatialTool] Execute called with:', params);

    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    let feedbackMessage = `Processing geospatial query (type: ${queryType})... Connecting to mapping service...`;
    uiFeedbackStream.update(feedbackMessage);

    const mcpClient = await getConnectedMcpClient();
    if (!mcpClient) {
      feedbackMessage = 'Geospatial functionality is unavailable. Please check configuration.';
      uiFeedbackStream.update(feedbackMessage);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
      return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), timestamp: new Date().toISOString(), mcp_response: null, error: 'MCP client initialization failed' };
    }

    let mcpData: McpResponse | null = null;
    let toolError: string | null = null;

    try {
      feedbackMessage = `Connected to mapping service. Processing ${queryType} query...`;
      uiFeedbackStream.update(feedbackMessage);

      // Pick appropriate tool
      const toolName = await (async () => {
        const { tools } = await mcpClient.listTools().catch(() => ({ tools: [] }));
        const names = new Set(tools?.map((t: any) => t.name) || []);
        const prefer = (...cands: string[]) => cands.find(n => names.has(n));
        switch (queryType) {
          case 'directions':
          case 'distance': return prefer('calculate_distance', 'mapbox_matrix', 'mapbox_directions') || 'mapbox_matrix';
          case 'search': return prefer('search_nearby_places', 'mapbox_geocoding') || 'mapbox_geocoding';
          case 'map': return prefer('generate_map_link', 'mapbox_geocoding') || 'mapbox_geocoding';
          case 'reverse':
          case 'geocode': return prefer('geocode_location', 'mapbox_geocoding') || 'mapbox_geocoding';
        }
      })();

      // Build arguments
      const toolArgs = (() => {
        switch (queryType) {
          case 'directions':
          case 'distance': return { places: [params.origin, params.destination], includeMapPreview: includeMap, mode: params.mode || 'driving' };
          case 'reverse': return { searchText: `${params.coordinates.latitude},${params.coordinates.longitude}`, includeMapPreview: includeMap, maxResults: params.maxResults || 5 };
          case 'search': return { searchText: params.query, includeMapPreview: includeMap, maxResults: params.maxResults || 5, ...(params.coordinates && { proximity: `${params.coordinates.latitude},${params.coordinates.longitude}` }), ...(params.radius && { radius: params.radius }) };
          case 'geocode':
          case 'map': return { searchText: params.location, includeMapPreview: includeMap, maxResults: queryType === 'geocode' ? params.maxResults || 5 : undefined };
        }
      })();

      console.log('[GeospatialTool] Calling tool:', toolName, 'with args:', toolArgs);

      // Retry logic
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let toolCallResult;
      while (retryCount < MAX_RETRIES) {
        try {
          toolCallResult = await Promise.race([
            mcpClient.callTool({ name: toolName, arguments: toolArgs }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Tool call timeout')), 30000)),
          ]);
          break;
        } catch (error: any) {
          retryCount++;
          if (retryCount === MAX_RETRIES) throw new Error(`Tool call failed after ${MAX_RETRIES} retries: ${error.message}`);
          console.warn(`[GeospatialTool] Retry ${retryCount}/${MAX_RETRIES}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Extract & parse content
      const serviceResponse = toolCallResult as { content?: Array<{ text?: string | null } | { [k: string]: any }> };
      const blocks = serviceResponse?.content || [];
      const textBlocks = blocks.map(b => (typeof b.text === 'string' ? b.text : null)).filter((t): t is string => !!t && t.trim().length > 0);
      if (textBlocks.length === 0) throw new Error('No content returned from mapping service');

      let content: any = textBlocks.find(t => t.startsWith('```json')) || textBlocks[0];
      const jsonRegex = /```(?:json)?\n?([\s\S]*?)\n?```/;
      const match = content.match(jsonRegex);
      if (match) content = match[1].trim();

      try { content = JSON.parse(content); }
      catch { console.warn('[GeospatialTool] Content is not JSON, using as string:', content); }

      // Process results
      mcpData = content;
      feedbackMessage = `Successfully processed ${queryType} query`;
      uiFeedbackStream.update(feedbackMessage);

    } catch (error: any) {
      toolError = `Mapping service error: ${error.message}`;
      uiFeedbackStream.update(toolError);
      console.error('[GeospatialTool] Tool execution failed:', error);
    } finally {
      await closeClient(mcpClient);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
    }

    return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: mcpData, error: toolError };
  },
});
