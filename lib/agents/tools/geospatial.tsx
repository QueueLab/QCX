/**
 * Fixed geospatial tool with improved error handling and schema
 */
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
import { initializeComposioMapbox } from '@/mapbox_mcp/composio-mapbox';
import { z } from 'zod';

/**
 * Establish connection to the Composio Mapbox client with proper environment validation.
 */
async function getConnectedMcpClient() {
  const composioApiKey = process.env.COMPOSIO_API_KEY;
  const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;
  const composioUserId = process.env.COMPOSIO_USER_ID;

  if (!composioApiKey || !mapboxAccessToken || !composioUserId) {
    console.error('[GeospatialTool] Missing required environment variables');
    return null;
  }

  try {
    const { composio } = await initializeComposioMapbox();
    return composio;
  } catch (error) {
    console.error('[GeospatialTool] Failed to initialize Composio:', error);
    return null;
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
Generates static map images using the Mapbox static image API.

Category search tool:
Performs a category search using the Mapbox Search Box category search API.

Reverse geocoding tool: 
Performs reverse geocoding using the Mapbox geocoding V6 API.

Directions tool:
Fetches routing directions using the Mapbox Directions API.

Isochrone tool:
Computes areas that are reachable within a specified amount of times from a location using Mapbox Isochrone API.

Search and geocode tool:
Uses the Mapbox Search Box Text Search API endpoint to power searching for and geocoding POIs, addresses, places, and any other types supported by that API.`,
  parameters: geospatialQuerySchema,
  execute: async (params: z.infer<typeof geospatialQuerySchema>) => {
    const { queryType, includeMap = true } = params;
    console.log('[GeospatialTool] Execute called with:', params);

    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    let feedbackMessage = `Processing geospatial query (type: ${queryType})... Connecting to mapping service...`;
    uiFeedbackStream.update(feedbackMessage);

    const composio = await getConnectedMcpClient();
    if (!composio) {
      feedbackMessage = 'Geospatial functionality is unavailable. Please check configuration.';
      uiFeedbackStream.update(feedbackMessage);
      uiFeedbackStream.done();
      return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), timestamp: new Date().toISOString(), mcp_response: null, error: 'Composio initialization failed' };
    }

    try {
      feedbackMessage = `Connected to mapping service. Processing ${queryType} query...`;
      uiFeedbackStream.update(feedbackMessage);

      // Map queryType to Composio action
      const actionName = (() => {
        switch (queryType) {
          case 'directions': return 'mapbox_directions';
          case 'distance': return 'mapbox_matrix';
          case 'search': return 'mapbox_search_box_text_search';
          case 'map': return 'mapbox_static_image';
          case 'reverse': return 'mapbox_reverse_geocoding';
          case 'geocode': return 'mapbox_search_box_text_search';
          default: return 'mapbox_search_box_text_search';
        }
      })();

      // Build arguments based on action
      const actionArgs = (() => {
        switch (queryType) {
          case 'directions': return { waypoints: `${params.origin};${params.destination}`, profile: params.mode || 'driving' };
          case 'distance': return { coordinates: `${params.origin};${params.destination}`, profile: params.mode || 'driving' };
          case 'reverse': return { longitude: params.coordinates.longitude, latitude: params.coordinates.latitude };
          case 'search': return { q: params.query, proximity: params.coordinates ? `${params.coordinates.longitude},${params.coordinates.latitude}` : undefined };
          case 'geocode': return { q: params.location };
          case 'map': return { location: params.location, zoom: 12 };
          default: return {};
        }
      })();

      console.log(`[GeospatialTool] Calling Composio action: ${actionName}`, actionArgs);
      const result = await composio.tools.execute(actionName, {
        arguments: actionArgs,
        userId: process.env.COMPOSIO_USER_ID
      });
      
      feedbackMessage = `Successfully retrieved data for ${queryType}.`;
      uiFeedbackStream.update(feedbackMessage);
      uiFeedbackStream.done();

      return {
        type: 'MAP_QUERY_TRIGGER',
        originalUserInput: JSON.stringify(params),
        timestamp: new Date().toISOString(),
        mcp_response: result,
        queryType
      };
    } catch (error: any) {
      console.error('[GeospatialTool] Execution error:', error);
      feedbackMessage = `Error processing geospatial query: ${error.message}`;
      uiFeedbackStream.update(feedbackMessage);
      uiFeedbackStream.done();
      return { error: error.message };
    }
  }
});
