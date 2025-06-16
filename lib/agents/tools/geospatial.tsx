import { createStreamableValue } from 'ai/rsc';
import { experimental_createMCPClient } from 'ai'; // Import for MCP Client from 'ai'
import { BotMessage } from '@/components/message'; // For UI feedback
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
import { ToolProps } from '.'; // ToolProps now includes currentUserLocation

export const geospatialTool = ({ uiStream, fullResponse, currentUserLocation }: ToolProps) => ({
  description: `Use this tool for any queries that involve locations, places, addresses, distances between places, directions, or finding points of interest on a map. This includes questions like:
- 'Where is [place name/address]?'
- 'Show me [place name/address] on the map.'
- 'What's the latitude and longitude of [place name]?'
- 'How far is it from [location A] to [location B]?'
- 'Give me directions from [location A] to [location B].'
- 'Find cafes near [current location/specified location].'
- 'What's around the [specific landmark]?'
- Any query that implies needing a map or spatial understanding.`,
  parameters: geospatialQuerySchema,
  execute: async ({ query }: { query: string }) => {
    let augmentedQuery = query;
    if (currentUserLocation?.place_name) {
      // Heuristic: if query is generic (e.g., "find cafes", "parks"), append location.
      // Generic if it doesn't contain prepositions of location or common address characters like ','.
      const isGenericQuery = !/\b(near|in|at|from|to)\b/i.test(query) && !query.includes(',');
      if (isGenericQuery) {
        augmentedQuery = `${query} near ${currentUserLocation.place_name}`;
        console.log(`[GeospatialTool] Augmented query from "${query}" to "${augmentedQuery}" using current location.`);
      }
    }

    // Provide immediate UI feedback by creating a streamable value for the message.
    const uiFeedbackStream = createStreamableValue<string>();
    // Set the content of the stream and mark it as done.
    uiFeedbackStream.done(`Looking up map information for: "${augmentedQuery}"...`);
    // Append the BotMessage component with the streamable value to the UI stream.
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    // Log environment variable placeholders
    console.log(`[GeospatialTool] Attempting to use SMITHERY_PROFILE_ID: "${process.env.SMITHERY_PROFILE_ID}"`);
    if (process.env.SMITHERY_API_KEY) {
      console.log(`[GeospatialTool] Attempting to use SMITHERY_API_KEY: "****${process.env.SMITHERY_API_KEY.slice(-4)}" (masked)`);
    } else {
      console.log(`[GeospatialTool] SMITHERY_API_KEY is not set or empty.`);
    }

    // MCP Client setup and tool call
    const mcpServerUrl = 'https://server.smithery.ai/mapbox-mcp-server/mcp?api_key=705b0222-a657-4cd2-b180-80c406cf6179&profile=smooth-lemur-vfUbUE'
    //const mcpServerUrl = `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server/mcp?profile=${process.env.SMITHERY_PROFILE_ID}&api_key=${process.env.SMITHERY_API_KEY}`;
    let client: any; // Define client here to be accessible in finally
    let mcpData: {
      location: {
        latitude?: number;
        longitude?: number;
        place_name?: string;
        address?: string;
      };
      mapUrl?: string;
    } | null = null;

    try {
      console.log(`Attempting to connect to MCP server at ${mcpServerUrl.split('?')[0]}...`); // Log without API key
      client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: mcpServerUrl,
        },
      });
      console.log("✅ Successfully connected to MCP server.");

      const geocodeParams = { query, includeMapPreview: true };
      console.log("📞 Attempting to call 'geocode_location' tool with params:", { query: augmentedQuery, includeMapPreview: true });
      const geocodeResult = await client.callTool('geocode_location', { query: augmentedQuery, includeMapPreview: true });
      // console.log("🗺️ Geocode Result from MCP:", JSON.stringify(geocodeResult, null, 2)); // Removed verbose log

      if (geocodeResult && geocodeResult.content && Array.isArray(geocodeResult.content)) {
        // The structured JSON is expected in the last text block from server.ts
        const lastContentItem = geocodeResult.content[geocodeResult.content.length - 1];
        if (lastContentItem && lastContentItem.type === 'text' && typeof lastContentItem.text === 'string') {
          const jsonRegex = /```json\n([\s\S]*?)\n```/;
          const match = lastContentItem.text.match(jsonRegex);
          if (match && match[1]) {
            try {
              const parsedJson = JSON.parse(match[1]);
              if (parsedJson.location) {
                mcpData = {
                  location: {
                    latitude: parsedJson.location.latitude,
                    longitude: parsedJson.location.longitude,
                    place_name: parsedJson.location.place_name,
                    address: parsedJson.location.address,
                  },
                  mapUrl: parsedJson.mapUrl,
                };
                console.log("✅ Successfully parsed MCP geocode data:", mcpData);
              } else {
                console.warn("⚠️ Parsed JSON from MCP does not contain expected 'location' field.");
              }
            } catch (parseError) {
              console.error("❌ Error parsing JSON from MCP response:", parseError, "\nRaw text was:", lastContentItem.text);
            }
          } else {
            console.warn("⚠️ Could not find JSON block in the expected format in MCP response.");
          }
        } else {
          console.warn("⚠️ Last content item from MCP is not a text block or is missing.");
        }
      } else {
        console.warn("⚠️ Geocode result from MCP is not in the expected format (missing content array).", geocodeResult);
      }

    } catch (error) {
      console.error("❌ MCP connection or tool call failed:", error);
      // Optionally, inform the user about the failure via UI stream
      // const errorFeedback = createStreamableValue();
      // errorFeedback.done(`Failed to get map details from advanced service.`);
      // uiStream.append(<BotMessage type="error" content={errorFeedback.value} />);
    } finally {
      if (client) {
        console.log("\nClosing MCP client connection...");
        await client.close();
        console.log("🔌 Client connection closed.");
      }
    }

    // Return a marker object for client-side processing, now including MCP data
    return {
      type: "MAP_QUERY_TRIGGER", // Or a new type like "GEOSPATIAL_DATA_RESULT"
      originalUserInput: augmentedQuery, // Return the query that was actually used
      timestamp: new Date().toISOString(),
      mcp_response: mcpData // Include the parsed MCP data
    };
  }
});
