import { geospatialQuerySchema } from '@/lib/schema/geospatial';
import { Client as MCPClientClass } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSelectedModel } from '@/lib/actions/users';
import { MapProvider } from '@/lib/store/settings';

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

/**
 * Establish connection to the MCP server with proper environment validation.
 */
async function getConnectedMcpClient(): Promise<McpClient | null> {
  const composioApiKey = process.env.COMPOSIO_API_KEY;
  const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;
  const composioUserId = process.env.COMPOSIO_USER_ID;

  if (!composioApiKey || !mapboxAccessToken || !composioUserId || !composioApiKey.trim() || !mapboxAccessToken.trim() || !composioUserId.trim()) {
    console.error('[GeospatialTool] Missing or empty required environment variables');
    return null;
  }

  let config;
  try {
    let mapboxMcpConfig;
    try {
      mapboxMcpConfig = require('../../../mapbox_mcp_config.json');
      config = { ...mapboxMcpConfig, mapboxAccessToken };
    } catch (configError: any) {
      throw configError;
    }
  } catch (configError: any) {
    config = { mapboxAccessToken, version: '1.0.0', name: 'mapbox-mcp-server' };
  }

  let serverUrlToUse: URL;
  try {
    const baseUrl = 'https://api.composio.dev/v1/mcp/mapbox';
    serverUrlToUse = new URL(baseUrl);
    serverUrlToUse.searchParams.set('api_key', composioApiKey);
    serverUrlToUse.searchParams.set('user_id', composioUserId);
  } catch (urlError: any) {
    return null;
  }

  let transport;
  try {
    transport = new StreamableHTTPClientTransport(serverUrlToUse);
  } catch (transportError: any) {
    return null;
  }

  let client;
  try {
    client = new MCPClientClass({ name: 'GeospatialToolClient', version: '1.0.0' });
  } catch (clientError: any) {
    return null;
  }

  try {
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)),
    ]);
  } catch (connectError: any) {
    return null;
  }

  return client;
}

async function closeClient(client: McpClient | null) {
  if (!client) return;
  try {
    await Promise.race([
      client.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout after 5 seconds')), 5000)),
    ]);
  } catch (error: any) {
    console.error('[GeospatialTool] Error closing MCP client:', error.message);
  }
}

export const geospatialTool = ({
  mapProvider
}: {
  mapProvider?: MapProvider
}) => ({
  description: `Use this tool for location-based queries...`,
  parameters: geospatialQuerySchema,
  execute: async (params: z.infer<typeof geospatialQuerySchema>) => {
    const { queryType, includeMap = true } = params;
    const selectedModel = await getSelectedModel();

    if (selectedModel?.includes('gemini') && mapProvider === 'google') {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_3_PRO_API_KEY!);
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-pro-latest',
        });

        const searchText = (params as any).location || (params as any).query;
        const prompt = `Find the location for: ${searchText}`;
        const tools: any = [{ googleSearch: {} }];
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools,
        });
        const response = await result.response;
        const functionCalls = (response as any).functionCalls();

        if (functionCalls && functionCalls.length > 0) {
          const gsr = functionCalls[0];
          const place = (gsr as any).results[0].place;
          if (place) {
            const { latitude, longitude } = place.coordinates;
            const place_name = place.displayName;
            const mcpData = {
              location: {
                latitude,
                longitude,
                place_name,
              },
            };
            return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: mcpData, error: null };
          }
        }
        throw new Error('No location found by Gemini.');
      } catch (error: any) {
        return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: null, error: error.message };
      }
    }

    const mcpClient = await getConnectedMcpClient();
    if (!mcpClient) {
      return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), timestamp: new Date().toISOString(), mcp_response: null, error: 'MCP client initialization failed' };
    }

    let mcpData: McpResponse | null = null;
    let toolError: string | null = null;

    try {
      const toolName = await (async () => {
        const { tools } = await mcpClient.listTools().catch(() => ({ tools: [] }));
        const names = new Set(tools?.map((t: any) => t.name) || []);
        const prefer = (...cands: string[]) => cands.find(n => names.has(n));
        switch (queryType) {
          case 'directions': return prefer('directions_tool') 
          case 'distance': return prefer('matrix_tool');
          case 'search': return prefer( 'isochrone_tool','category_search_tool') || 'poi_search_tool';
          case 'map': return prefer('static_map_image_tool') 
          case 'reverse': return prefer('reverse_geocode_tool');
          case 'geocode': return prefer('forward_geocode_tool');
        }
      })();

      const toolArgs = (() => {
        switch (queryType) {
          case 'directions': return { waypoints: [params.origin, params.destination], includeMapPreview: includeMap, profile: params.mode };
          case 'distance': return { places: [params.origin, params.destination], includeMapPreview: includeMap, mode: params.mode || 'driving' };
          case 'reverse': return { searchText: `${params.coordinates.latitude},${params.coordinates.longitude}`, includeMapPreview: includeMap, maxResults: params.maxResults || 5 };
          case 'search': return { searchText: params.query, includeMapPreview: includeMap, maxResults: params.maxResults || 5, ...(params.coordinates && { proximity: `${params.coordinates.latitude},${params.coordinates.longitude}` }), ...(params.radius && { radius: params.radius }) };
          case 'geocode': 
          case 'map': return { searchText: params.location, includeMapPreview: includeMap, maxResults: queryType === 'geocode' ? params.maxResults || 5 : undefined };
        }
      })();

      let toolCallResult = await mcpClient.callTool({ name: toolName ?? 'unknown_tool', arguments: toolArgs });
      const serviceResponse = toolCallResult as { content?: Array<{ text?: string | null } | { [k: string]: any }> };
      const blocks = serviceResponse?.content || [];
      const textBlocks = blocks.map(b => (typeof b.text === 'string' ? b.text : null)).filter((t): t is string => !!t && t.trim().length > 0);
      if (textBlocks.length === 0) throw new Error('No content returned from mapping service');

      let content: any = textBlocks.find(t => t.startsWith('```json')) || textBlocks[0];
      const jsonRegex = /```(?:json)?\n?([\s\S]*?)\n?```/;
      const match = content.match(jsonRegex);
      if (match) content = match[1].trim();
      try { content = JSON.parse(content); } catch { }

      if (typeof content === 'object' && content !== null) {
        const parsedData = content as any;
        if (parsedData.results?.length > 0) {
          const firstResult = parsedData.results[0];
          mcpData = { location: { latitude: firstResult.coordinates?.latitude, longitude: firstResult.coordinates?.longitude, place_name: firstResult.name || firstResult.place_name, address: firstResult.full_address || firstResult.address }, mapUrl: parsedData.mapUrl };
        } else if (parsedData.location) {
          mcpData = { location: { latitude: parsedData.location.latitude, longitude: parsedData.location.longitude, place_name: parsedData.location.place_name || parsedData.location.name, address: parsedData.location.address || parsedData.location.formatted_address }, mapUrl: parsedData.mapUrl || parsedData.map_url };
        } else {
          throw new Error("Response missing required 'location' or 'results' field");
        }
      } else throw new Error('Unexpected response format from mapping service');
    } catch (error: any) {
      toolError = error.message;
    } finally {
      await closeClient(mcpClient);
    }
    return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: mcpData, error: toolError };
  },
});
