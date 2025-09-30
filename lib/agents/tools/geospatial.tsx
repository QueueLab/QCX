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
    // Use static import for config
    let mapboxMcpConfig;
    try {
      mapboxMcpConfig = require('../../../mapbox_mcp_config.json');
      config = { ...mapboxMcpConfig, mapboxAccessToken };
      console.log('[GeospatialTool] Config loaded successfully');
    } catch (configError: any) {
      throw configError;
    }
  } catch (configError: any) {
    console.error('[GeospatialTool] Failed to load mapbox config:', configError.message);
    config = { mapboxAccessToken, version: '1.0.0', name: 'mapbox-mcp-server' };
    console.log('[GeospatialTool] Using fallback config');
  }

  // Build Smithery URL
  const smitheryUrlOptions = { config, apiKey, profileId };
  const mcpServerBaseUrl = `https://server.smithery.ai/@Waldzell-Agentics/mcp-server/mcp?api_key=${smitheryUrlOptions.apiKey}&profile=${smitheryUrlOptions.profileId}`;
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
  There a plethora of tools inside this tool accessible on the mapbox mcp server where switch case into the tool of choice for that use case
  If the Query is supposed to use multiple tools in a sequence you must access all the tools in the sequence and then provide a final answer based on the results of all the tools used. 

Static image tool:

Generates static map images using the Mapbox static image API. Features include:

Custom map styles (streets, outdoors, satellite, etc.)
Adjustable image dimensions and zoom levels
Support for multiple markers with custom colors and labels
Overlay options including polylines and polygons
Auto-fitting to specified coordinates

Category search tool:

Performs a category search using the Mapbox Search Box category search API. Features include:
Search for points of interest by category (restaurants, hotels, gas stations, etc.)
Filtering by geographic proximity
Customizable result limits
Rich metadata for each result
Support for multiple languages

Reverse geocoding tool: 

Performs reverse geocoding using the Mapbox geocoding V6 API. Features include:
Convert geographic coordinates to human-readable addresses
Customizable levels of detail (street, neighborhood, city, etc.)
Results filtering by type (address, poi, neighborhood, etc.)
Support for multiple languages
Rich location context information

Directions tool:

Fetches routing directions using the Mapbox Directions API. Features include:

Support for different routing profiles: driving (with live traffic or typical), walking, and cycling
Route from multiple waypoints (2-25 coordinate pairs)
Alternative routes option
Route annotations (distance, duration, speed, congestion)

Scheduling options:

Future departure time (depart_at) for driving and driving-traffic profiles
Desired arrival time (arrive_by) for driving profile only
Profile-specific optimizations:
Driving: vehicle dimension constraints (height, width, weight)
Exclusion options for routing:
Common exclusions: ferry routes, cash-only tolls
Driving-specific exclusions: tolls, motorways, unpaved roads, tunnels, country borders, state borders
Custom point exclusions (up to 50 geographic points to avoid)
GeoJSON geometry output format

Isochrone tool:

Computes areas that are reachable within a specified amount of times from a location using Mapbox Isochrone API. Features include:

Support for different travel profiles (driving, walking, cycling)
Customizable travel times or distances
Multiple contour generation (e.g., 15, 30, 45 minute ranges)
Optional departure or arrival time specification
Color customization for visualization

Search and geocode tool:
Uses the Mapbox Search Box Text Search API endpoint to power searching for and geocoding POIs, addresses, places, and any other types supported by that API. This tool consolidates the functionality that was previously provided by the ForwardGeocodeTool and PoiSearchTool (from earlier versions of this MCP server) into a single tool.`


,
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
          case 'directions': return prefer('directions_tool') 
          case 'distance': return prefer('matrix_tool');
          case 'search': return prefer( 'isochrone_tool','category_search_tool') || 'poi_search_tool';
          case 'map': return prefer('static_map_image_tool') 
          case 'reverse': return prefer('reverse_geocode_tool');
          case 'geocode': return prefer('forward_geocode_tool');
        }
      })();

      // Build arguments
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

      feedbackMessage = `Successfully processed ${queryType} query for: ${mcpData.location.place_name || JSON.stringify(params)}`;
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
