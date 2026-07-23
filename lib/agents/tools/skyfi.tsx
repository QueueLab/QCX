/**
 * SkyFi MCP integration tool
 */
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { Client as MCPClientClass } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';
import { SkyfiOAuthProvider } from '@/lib/skyfi/provider';
import { skyfiQuerySchema } from '@/lib/schema/skyfi';
import { DrawnFeature } from '@/lib/agents/resolution-search';
import { z } from 'zod';

export type McpClient = MCPClientClass;

function getRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/skyfi/callback`;
}

function geoJsonToWkt(geometry: any): string | null {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0];
    const ringStr = coords.map((c: any) => `${c[0]} ${c[1]}`).join(', ');
    return `POLYGON((${ringStr}))`;
  } else if (geometry.type === 'LineString') {
    const coords = geometry.coordinates;
    const lineStr = coords.map((c: any) => `${c[0]} ${c[1]}`).join(', ');
    return `LINESTRING(${lineStr})`;
  } else if (geometry.type === 'Point') {
    const coords = geometry.coordinates;
    return `POINT(${coords[0]} ${coords[1]})`;
  }
  return null;
}

/**
 * Establish connection to the SkyFi MCP server with the user's stored OAuth token.
 */
async function getConnectedSkyfiMcpClient(accessToken: string): Promise<McpClient | null> {
  console.log('[SkyfiTool] Connecting to SkyFi MCP server via OAuth Bearer token...');

  const serverUrl = new URL('https://mcp.skyfi.com/mcp');

  // Create transport with headers
  let transport;
  try {
    transport = new StreamableHTTPClientTransport(serverUrl, {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Skyfi-Api-Key': accessToken,
        }
      }
    });
    console.log('[SkyfiTool] Transport created successfully');
  } catch (transportError: any) {
    console.error('[SkyfiTool] Failed to create transport:', transportError.message);
    return null;
  }

  // Create client
  let client;
  try {
    client = new MCPClientClass({ name: 'SkyfiToolClient', version: '1.0.0' });
    console.log('[SkyfiTool] MCP Client instance created');
  } catch (clientError: any) {
    console.error('[SkyfiTool] Failed to create MCP client:', clientError.message);
    return null;
  }

  // Connect to server
  try {
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)),
    ]);
    console.log('[SkyfiTool] Successfully connected to SkyFi MCP server');
  } catch (connectError: any) {
    console.error('[SkyfiTool] SkyFi MCP connection failed:', connectError.message);
    return null;
  }

  return client;
}

/**
 * Safely close the MCP client.
 */
async function closeClient(client: McpClient | null) {
  if (!client) return;
  try {
    await Promise.race([
      client.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout after 5 seconds')), 5000)),
    ]);
    console.log('[SkyfiTool] MCP client closed successfully');
  } catch (error: any) {
    console.error('[SkyfiTool] Error closing MCP client:', error.message);
  }
}

/**
 * SkyFi tool executor.
 */
export const skyfiTool = ({
  uiStream,
  drawnFeatures
}: {
  uiStream: ReturnType<typeof createStreamableUI>;
  drawnFeatures?: DrawnFeature[];
}) => ({
  description: `Use this tool to connect directly to the user's SkyFi account via the SkyFi MCP server.
  Capabilities include:
  - Checking account status, remaining budget, and organizations ('whoami').
  - Geocoding/creating WKT Polygons for Areas of Interest ('geocode').
  - Searching satellite archive catalog for latest captures over an Area of Interest ('search').
  - Validating/pricing an archive order before purchase ('validate_order').
  - Placing actual billable orders for satellite images ('place_order') (requires explicit customer confirmation first!).
  - Listing previous orders ('list_orders').

  Always ask the user for permission before placing a billable order! Ensure you call 'validate_order' first to display the cost.`,
  parameters: skyfiQuerySchema,
  execute: async (params: z.infer<typeof skyfiQuerySchema>) => {
    const { queryType, location, aoi, params: extraParams } = params;
    console.log('[SkyfiTool] Execute called with:', params);

    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    // Resolve user ID
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      const errorMsg = 'Please log in to use the SkyFi tool.';
      uiFeedbackStream.update(errorMsg);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
      return { type: 'SKYFI_QUERY', success: false, error: 'Unauthorized', message: errorMsg };
    }

    // Resolve OAuth tokens
    const redirectUri = getRedirectUri();
    const provider = new SkyfiOAuthProvider(userId, redirectUri);
    const tokens = await provider.tokens();

    if (!tokens || !tokens.access_token) {
      const missingKeyMessage = `Your SkyFi account is not connected. Please connect your SkyFi account in Settings -> Tools tab first.`;
      uiFeedbackStream.update(missingKeyMessage);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
      return { type: 'SKYFI_QUERY', success: false, error: 'Unauthenticated', message: missingKeyMessage };
    }

    let feedbackMessage = `Connecting to SkyFi MCP server...`;
    uiFeedbackStream.update(feedbackMessage);

    const mcpClient = await getConnectedSkyfiMcpClient(tokens.access_token);
    if (!mcpClient) {
      feedbackMessage = 'Failed to connect to the SkyFi MCP server. Your login may have expired, please try reconnecting in Settings.';
      uiFeedbackStream.update(feedbackMessage);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
      return { type: 'SKYFI_QUERY', success: false, error: 'Connection failed' };
    }

    try {
      feedbackMessage = `Successfully connected to SkyFi. Executing '${queryType}' action...`;
      uiFeedbackStream.update(feedbackMessage);

      // Determine correct MCP tool name and format parameters
      let mcpToolName = '';
      let mcpArgs: Record<string, any> = {};

      // Convert any drawn AOI geometry to WKT
      let resolvedAoiWkt = aoi;
      if (!resolvedAoiWkt && drawnFeatures && drawnFeatures.length > 0) {
        const latestPolygon = drawnFeatures.find(f => f.type === 'Polygon');
        if (latestPolygon) {
          resolvedAoiWkt = geoJsonToWkt(latestPolygon.geometry) || undefined;
        } else {
          resolvedAoiWkt = geoJsonToWkt(drawnFeatures[0].geometry) || undefined;
        }
        if (resolvedAoiWkt) {
          console.log('[SkyfiTool] Resolved WKT from user drawn features on map:', resolvedAoiWkt);
        }
      }

      switch (queryType) {
        case 'whoami':
          mcpToolName = 'skyfi_whoami';
          mcpArgs = {};
          break;
        case 'geocode':
          mcpToolName = 'skyfi_geocode_aoi';
          mcpArgs = { place: location || extraParams?.place };
          break;
        case 'search':
          mcpToolName = 'skyfi_search_archive_with_map';
          mcpArgs = {
            aoi: resolvedAoiWkt || extraParams?.aoi,
            ...extraParams
          };
          break;
        case 'validate_order':
          mcpToolName = 'skyfi_validate_archive_order';
          mcpArgs = {
            aoi: resolvedAoiWkt || extraParams?.aoi,
            ...extraParams
          };
          break;
        case 'place_order':
          mcpToolName = 'skyfi_place_archive_order';
          mcpArgs = {
            aoi: resolvedAoiWkt || extraParams?.aoi,
            ...extraParams
          };
          break;
        case 'list_orders':
          mcpToolName = 'skyfi_list_orders';
          mcpArgs = {
            ...extraParams
          };
          break;
        default:
          throw new Error(`Unsupported queryType: ${queryType}`);
      }

      // If we need WKT but don't have it, and we have a place name/location, geocode it first!
      if (!mcpArgs.aoi && (queryType === 'search' || queryType === 'validate_order' || queryType === 'place_order') && location) {
        feedbackMessage = `Geocoding '${location}' using SkyFi to build Area of Interest...`;
        uiFeedbackStream.update(feedbackMessage);

        const geocodeResult = await mcpClient.callTool({
          name: 'skyfi_geocode_aoi',
          arguments: { place: location }
        }) as any;

        const geocodeText = geocodeResult?.content?.[0]?.text || '';
        // Extract polygon WKT
        const wktMatch = geocodeText.match(/POLYGON\s*\(\([\s\S]+?\)\)/i) || geocodeText.match(/MULTIPOLYGON\s*\([\s\S]+?\)/i);
        if (wktMatch) {
          mcpArgs.aoi = wktMatch[0];
          console.log('[SkyfiTool] Geocoded location to WKT:', mcpArgs.aoi);
        } else {
          throw new Error(`Could not resolve location '${location}' to a valid Area of Interest polygon.`);
        }
      }

      console.log('[SkyfiTool] Calling tool:', mcpToolName, 'with args:', mcpArgs);

      const mcpResult = await Promise.race([
        mcpClient.callTool({ name: mcpToolName, arguments: mcpArgs }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SkyFi MCP Tool call timeout after 30 seconds')), 30000)),
      ]);

      const serviceResponse = mcpResult as { content?: Array<{ text?: string | null } | { [k: string]: any }> };
      const blocks = serviceResponse?.content || [];
      const textBlocks = blocks.map(b => (typeof b.text === 'string' ? b.text : null)).filter((t): t is string => !!t && t.trim().length > 0);

      const rawText = textBlocks[0] || 'Success';

      feedbackMessage = `Action '${queryType}' executed successfully.`;
      uiFeedbackStream.update(feedbackMessage);

      await closeClient(mcpClient);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);

      return {
        type: 'SKYFI_QUERY',
        success: true,
        queryType,
        result: rawText,
        error: null
      };
    } catch (error: any) {
      const toolError = `SkyFi execution failed: ${error.message}`;
      console.error('[SkyfiTool] Execution failed:', error);
      uiFeedbackStream.update(toolError);
      await closeClient(mcpClient);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
      return {
        type: 'SKYFI_QUERY',
        success: false,
        queryType,
        result: null,
        error: toolError
      };
    }
  }
});
