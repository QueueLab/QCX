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

  console.log('[GeospatialTool] Environment check:', {
    apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
    mapboxAccessToken: mapboxAccessToken ? `${mapboxAccessToken.substring(0, 8)}...` : 'MISSING',
    profileId: profileId ? `${profileId.substring(0, 8)}...` : 'MISSING',
  });

  if (!apiKey || !mapboxAccessToken || !profileId) {
    console.error('[GeospatialTool] Missing required environment variables');
    return null;
  }

  if (!apiKey.trim() || !mapboxAccessToken.trim() || !profileId.trim()) {
    console.error('[GeospatialTool] Empty environment variables detected');
    return null;
  }

  let config;
  try {
    const mapboxMcpConfig = await import('QCX/mapbox_mcp_config.json');
    config = { 
      ...mapboxMcpConfig.default || mapboxMcpConfig, 
      mapboxAccessToken 
    };
    console.log('[GeospatialTool] Config loaded successfully');
  } catch (configError: any) {
    console.error('[GeospatialTool] Failed to load mapbox config:', configError.message);
    config = {
      mapboxAccessToken,
      version: '1.0.0',
      name: 'mapbox-mcp-server'
    };
    console.log('[GeospatialTool] Using fallback config');
  }

  const smitheryUrlOptions = { config, apiKey, profileId };
  const mcpServerBaseUrl = `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server`;

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
    console.error('[GeospatialTool] URL options:', { 
      baseUrl: mcpServerBaseUrl,
      hasConfig: !!config,
      hasApiKey: !!apiKey,
      hasProfileId: !!profileId
    });
    return null;
  }

  let transport;
  let client;
  
  try {
    transport = new StreamableHTTPClientTransport(serverUrlToUse, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    console.log('[GeospatialTool] Transport created successfully');
  } catch (transportError: any) {
    console.error('[GeospatialTool] Failed to create transport:', transportError.message);
    return null;
  }

  try {
    client = new MCPClientClass({ 
      name: 'GeospatialToolClient', 
      version: '1.0.0' 
    });
    console.log('[GeospatialTool] MCP Client instance created');
  } catch (clientError: any) {
    console.error('[GeospatialTool] Failed to create MCP client:', clientError.message);
    return null;
  }

  try {
    console.log('[GeospatialTool] Attempting to connect to MCP server...');
    
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000);
      }),
    ]);
    
    console.log('[GeospatialTool] Successfully connected to MCP server');
    
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
    });
    
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
    query: string; 
    queryType?: string; 
    includeMap?: boolean; 
  }) => {
    console.log('[GeospatialTool] Execute called with:', { query, queryType, includeMap });
    
    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    let feedbackMessage = `Processing geospatial query: "${query}". Connecting to mapping service...`;
    uiFeedbackStream.update(feedbackMessage);

    const mcpClient = await getConnectedMcpClient();
    
    if (!mcpClient) {
      feedbackMessage = 'Geospatial functionality is currently unavailable. Please check your configuration and try again.';
      uiFeedbackStream.update(feedbackMessage);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
      return {
        type: 'MAP_QUERY_TRIGGER',
        originalUserInput: query,
        timestamp: new Date().toISOString(),
        mcp_response: null,
        error: 'MCP client initialization failed - check environment variables and network connectivity',
      };
    }

    let mcpData: { 
      location: { 
        latitude?: number; 
        longitude?: number; 
        place_name?: string; 
        address?: string; 
      }; 
      mapUrl?: string; 
    } | null = null;
    let toolError: string | null = null;

    try {
      feedbackMessage = `Connected to mapping service. Processing "${query}"...`;
      uiFeedbackStream.update(feedbackMessage);
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);

      const toolName = queryType === 'directions' ? 'mapbox_directions' : 'mapbox_geocoding';
      const toolArgs = {
        searchText: query,
        includeMapPreview: includeMap !== false,
      };

      console.log('[GeospatialTool] Calling tool:', toolName, 'with args:', toolArgs);

      // Retry logic for tool call
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let geocodeResultUnknown;
      while (retryCount < MAX_RETRIES) {
        try {
          geocodeResultUnknown = await Promise.race([
            mcpClient.callTool({ name: toolName, arguments: toolArgs }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Tool call timeout after 30 seconds')), 30000);
            }),
          ]);
          break;
        } catch (error: any) {
          retryCount++;
          if (retryCount === MAX_RETRIES) {
            throw error;
          }
          console.warn(`[GeospatialTool] Retry ${retryCount}/${MAX_RETRIES} after error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('[GeospatialTool] Raw tool result:', geocodeResultUnknown);

      const geocodeResult = geocodeResultUnknown as { tool_results?: Array<{ content?: unknown }> };
      const toolResults = Array.isArray(geocodeResult.tool_results) ? geocodeResult.tool_results : [];
      
      if (toolResults.length === 0 || !toolResults[0]?.content) {
        throw new Error('No content returned from mapping service');
      }

      let content = toolResults[0].content;
      
      if (typeof content === 'string') {
        const jsonRegex = /```(?:json)?\n?([\s\S]*?)\n?```/;
        const match = content.match(jsonRegex);
        if (match) {
          content = match[1].trim();
        }
        
        try {
          if (typeof content === 'string') {
            content = JSON.parse(content);
          }
        } catch (parseError) {
          console.warn('[GeospatialTool] Content is not JSON, using as string:', content);
        }
      }

      if (typeof content === 'object' && content !== null) {
        const parsedData = content as any;
        
        if (parsedData.location) {
          mcpData = {
            location: {
              latitude: parsedData.location.latitude,
              longitude: parsedData.location.longitude,
              place_name: parsedData.location.place_name || parsedData.location.name,
              address: parsedData.location.address || parsedData.location.formatted_address,
            },
            mapUrl: parsedData.mapUrl || parsedData.map_url,
          };
        } else {
          throw new Error("Response missing required 'location' field");
        }
      } else {
        throw new Error("Unexpected response format from mapping service");
      }

      feedbackMessage = `Successfully processed location query for: ${mcpData.location.place_name || query}`;
      uiFeedbackStream.update(feedbackMessage);

    } catch (error: any) {
      console.error('[GeospatialTool] Tool execution failed:', error.message);
      console.error('[GeospatialTool] Error stack:', error.stack);
      toolError = `Mapping service error: ${error.message}`;
      feedbackMessage = toolError;
      uiFeedbackStream.update(feedbackMessage);
    } finally {
      await closeClient(mcpClient);
      uiFeedbackStream.done();
      uiStream.update(<BotMessage content={uiFeedbackStream.value} />);
    }

    return {
      type: 'MAP_QUERY_TRIGGER',
      originalUserInput: query,
      queryType: queryType || 'geocode',
      timestamp: new Date().toISOString(),
      mcp_response: mcpData,
      error: toolError,
    };
  },
});
