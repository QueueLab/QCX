/**
 * Fixed geospatial tool with improved error handling and schema
 */
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
// Smithery SDK removed - using direct URL construction
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSelectedModel } from '@/lib/actions/users';
import { MapProvider } from '@/lib/store/settings';
import { type McpResponse } from '@/lib/types/geospatial';

function getGoogleStaticMapUrl(lat: number, lng: number): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return '';
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=600x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
}

/**
 * Establish connection to the MCP server with proper environment validation.
 */
async function getConnectedMcpClient(): Promise<any | null> {
  const composioApiKey = process.env.COMPOSIO_API_KEY;
  const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;
  const composioUserId = process.env.COMPOSIO_USER_ID;

  if (!composioApiKey || !mapboxAccessToken || !composioUserId || !composioApiKey.trim() || !mapboxAccessToken.trim() || !composioUserId.trim()) {
    console.error('[GeospatialTool] Missing or empty required environment variables');
    return null;
  }

  try {
    // Dynamic imports to avoid Webpack issues with MCP SDK in production
    const { Client } = await import('@modelcontextprotocol/sdk/client/index');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp');

    const authConfigId = process.env.COMPOSIO_MAPBOX_AUTH_CONFIG_ID || 'mapbox';
    const baseUrl = 'https://backend.composio.dev/mcp/client/streamable';
    const url = `${baseUrl}?userId=${composioUserId}&authConfigId=${authConfigId}&mapboxApiKey=${mapboxAccessToken}&composioApiKey=${composioApiKey}`;

    const transport = new StreamableHTTPClientTransport(url);
    const client = new Client(
      { name: 'mapbox-mcp-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);
    return client;
  } catch (error) {
    console.error('[GeospatialTool] Failed to connect to MCP server:', error);
    return null;
  }
}

async function closeClient(client: any) {
  if (client) {
    try {
      await client.close();
    } catch (error) {
      console.warn('[GeospatialTool] Error closing client:', error);
    }
  }
}

export const geospatialTool = ({ uiStream, mapProvider }: { uiStream: any, mapProvider?: MapProvider }) => ({
  description: `Geospatial query tool for mapping, geocoding, and spatial analysis.
  Use this tool for:
  - Finding coordinates for a location
  - Getting directions between places
  - Searching for nearby points of interest
  - Calculating distances
  - Reverse geocoding (finding address from coordinates)`,
  parameters: geospatialQuerySchema,
  execute: async (params: z.infer<typeof geospatialQuerySchema>) => {
    const { queryType, includeMap = true } = params;

    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    const selectedModel = await getSelectedModel();

    if (selectedModel?.includes('gemini') && mapProvider === 'google') {
      uiFeedbackStream.update(`Processing geospatial query with Gemini...`);

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

            const mcpData: McpResponse = {
              location: {
                latitude,
                longitude,
                place_name,
              },
            };

            if (mapProvider === 'google') {
              mcpData.mapUrl = getGoogleStaticMapUrl(latitude, longitude);
            }

            uiFeedbackStream.update(`Found location: ${place_name}`);
            uiFeedbackStream.done();
            uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
            return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: mcpData, error: null };
          }
        }
        throw new Error('No location found by Gemini.');
      } catch (error: any) {
        const toolError = `Gemini grounding error: ${error.message}`;
        uiFeedbackStream.update(toolError);
        uiFeedbackStream.done();
        uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
        return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: null, error: toolError };
      }
    }

    uiFeedbackStream.update(`Connecting to mapping service...`);

    const mcpClient = await getConnectedMcpClient();
    if (!mcpClient) {
      uiFeedbackStream.update('Geospatial functionality is unavailable. Please check configuration.');
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
      return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), timestamp: new Date().toISOString(), mcp_response: null, error: 'MCP client initialization failed' };
    }

    let mcpData: McpResponse | null = null;
    let toolError: string | null = null;

    try {
      uiFeedbackStream.update(`Processing ${queryType} query...`);

      const toolName = await (async () => {
        const { tools } = await mcpClient.listTools().catch(() => ({ tools: [] }));
        const names = new Set(tools?.map((t: any) => t.name) || []);
        const prefer = (...cands: string[]) => cands.find(n => names.has(n));

        switch (queryType) {
          case 'directions': return prefer('directions_tool');
          case 'distance': return prefer('matrix_tool');
          case 'search': return prefer('isochrone_tool','category_search_tool') || 'poi_search_tool';
          case 'map': return prefer('static_map_image_tool');
          case 'reverse': return prefer('reverse_geocode_tool');
          case 'geocode': return prefer('forward_geocode_tool');
          default: return null;
        }
      })();

      if (!toolName) throw new Error(`No suitable tool found for query type: ${queryType}`);

      const toolArgs = (() => {
        switch (queryType) {
          case 'directions': return { waypoints: [params.origin, params.destination], includeMapPreview: includeMap, profile: params.mode };
          case 'distance': return { places: [params.origin, params.destination], includeMapPreview: includeMap, mode: params.mode || 'driving' };
          case 'reverse': return { searchText: `${params.coordinates.latitude},${params.coordinates.longitude}`, includeMapPreview: includeMap, maxResults: params.maxResults || 5 };
          case 'search': return { searchText: params.query, includeMapPreview: includeMap, maxResults: params.maxResults || 5, ...(params.coordinates && { proximity: `${params.coordinates.latitude},${params.coordinates.longitude}` }), ...(params.radius && { radius: params.radius }) };
          case 'geocode': 
          case 'map': return { searchText: params.location, includeMapPreview: includeMap, maxResults: queryType === 'geocode' ? params.maxResults || 5 : undefined };
          default: return {};
        }
      })();

      const toolCallResult = await mcpClient.callTool({ name: toolName, arguments: toolArgs });

      const serviceResponse = toolCallResult as any;
      const blocks = serviceResponse?.content || [];
      const textBlocks = blocks.map((b: any) => (typeof b.text === 'string' ? b.text : null)).filter((t: string | null): t is string => !!t);

      if (textBlocks.length === 0) throw new Error('No content returned from mapping service');

      let contentStr = textBlocks.find(t => t.startsWith('```json')) || textBlocks[0];
      const jsonRegex = /```(?:json)?\n?([\s\S]*?)\n?```/;
      const match = contentStr.match(jsonRegex);
      if (match) contentStr = match[1].trim();

      let content;
      try { content = JSON.parse(contentStr); }
      catch { content = contentStr; }

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

      uiFeedbackStream.update(`Successfully processed query for: ${mcpData.location.place_name}`);

      if (mapProvider === 'google' && mcpData.location.latitude && mcpData.location.longitude && !mcpData.mapUrl) {
        mcpData.mapUrl = getGoogleStaticMapUrl(mcpData.location.latitude, mcpData.location.longitude);
      }

    } catch (error: any) {
      toolError = `Mapping service error: ${error.message}`;
      uiFeedbackStream.update(toolError);
    } finally {
      await closeClient(mcpClient);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
    }

    return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: mcpData, error: toolError };
  },
});
