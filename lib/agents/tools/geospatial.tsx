// import { createStreamableValue } from 'ai/rsc'; // Removed
import { experimental_createMCPClient } from 'ai'; // This is fine for server-to-server MCP call
// import { BotMessage } from '@/components/message'; // Removed
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
// import { ToolProps } from '.'; // Removed

export const geospatialTool = () => ({
  description: `Use this tool for any queries that involve locations, places, addresses, distances between places, directions, or finding points of interest. This includes questions like:
- 'Where is [place name/address]?'
- 'Show me [place name/address] on the map.'
- 'What's the latitude and longitude of [place name]?'
- 'How far is it from [location A] to [location B]?'
- 'Give me directions from [location A] to [location B].'
- 'Find cafes near [current location/specified location].'
- 'What's around the [specific landmark]?'
- Any query that implies needing a map or spatial understanding.
The tool returns structured data including latitude, longitude, place name, address, and a map preview URL if available.`,
  parameters: geospatialQuerySchema,
  execute: async ({ query }: { query: string }) => {
    console.log(`[GeospatialTool] Received query: "${query}"`);

    // Environment variables for the Smithery MCP server connection
    const smitheryProfileId = process.env.SMITHERY_PROFILE_ID;
    const smitheryApiKey = process.env.SMITHERY_API_KEY;
    const fixedTestApiKey = "705b0222-a657-4cd2-b180-80c406cf6179"; // For testing if env vars fail
    const fixedTestProfile = "smooth-lemur-vfUbUE"; // For testing

    let mcpServerUrl: string;

    if (smitheryProfileId && smitheryApiKey) {
      mcpServerUrl = `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server/mcp?profile=${smitheryProfileId}&api_key=${smitheryApiKey}`;
      console.log(`[GeospatialTool] Using SMITHERY_PROFILE_ID and SMITHERY_API_KEY for MCP connection.`);
    } else {
      mcpServerUrl = `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server/mcp?api_key=${fixedTestApiKey}&profile=${fixedTestProfile}`;
      console.warn(`[GeospatialTool] SMITHERY_PROFILE_ID or SMITHERY_API_KEY not fully set. Falling back to fixed test API key and profile for MCP connection.`);
    }

    let client: any;
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
      console.log(`[GeospatialTool] Attempting to connect to external MCP server at ${mcpServerUrl.split('?')[0]}...`);
      client = await experimental_createMCPClient({
        transport: {
          type: 'sse', // Assuming the external MCP server uses SSE
          url: mcpServerUrl,
        },
      });
      console.log("[GeospatialTool] ✅ Successfully connected to external MCP server.");

      const geocodeParams = { query, includeMapPreview: true };
      console.log("[GeospatialTool] 📞 Attempting to call 'geocode_location' tool on external MCP server with params:", geocodeParams);
      const geocodeResult = await client.callTool('geocode_location', geocodeParams);

      if (geocodeResult && geocodeResult.content && Array.isArray(geocodeResult.content)) {
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
                console.log("[GeospatialTool] ✅ Successfully parsed MCP geocode data:", mcpData);
              } else {
                console.warn("[GeospatialTool] ⚠️ Parsed JSON from external MCP does not contain expected 'location' field.");
                mcpData = { error: "Parsed JSON from external MCP does not contain 'location' field.", details: parsedJson } as any;
              }
            } catch (parseError) {
              console.error("[GeospatialTool] ❌ Error parsing JSON from external MCP response:", parseError, "\nRaw text was:", lastContentItem.text);
              mcpData = { error: "Error parsing JSON from external MCP response.", details: (parseError as Error).message, rawText: lastContentItem.text } as any;
            }
          } else {
            console.warn("[GeospatialTool] ⚠️ Could not find JSON block in the expected format in external MCP response. Raw text:", lastContentItem.text);
            // If no JSON block, maybe the text itself is useful? Or treat as an error/incomplete data.
             mcpData = { warning: "Could not find JSON block in expected format.", details: lastContentItem.text } as any;
          }
        } else {
          console.warn("[GeospatialTool] ⚠️ Last content item from external MCP is not a text block or is missing.");
           mcpData = { error: "Last content item from external MCP is not a text block or is missing.", details: geocodeResult.content } as any;
        }
      } else {
        console.warn("[GeospatialTool] ⚠️ Geocode result from external MCP is not in the expected format.", geocodeResult);
        mcpData = { error: "Geocode result from external MCP is not in the expected format.", details: geocodeResult } as any;
      }

    } catch (error) {
      console.error("[GeospatialTool] ❌ External MCP connection or tool call failed:", error);
      return { error: `External MCP connection or tool call failed for query "${query}".`, details: (error as Error).message };
    } finally {
      if (client) {
        console.log("[GeospatialTool] Closing external MCP client connection...");
        await client.close();
        console.log("[GeospatialTool] 🔌 External MCP client connection closed.");
      }
    }

    // The tool should return the data that the LLM needs to formulate an answer,
    // or that the client application needs to render information (e.g., update a map).
    // The original returned a "MAP_QUERY_TRIGGER" type. For a server-side tool,
    // returning the data itself is more direct.
    if (mcpData && !(mcpData as any).error) {
      return {
        query: query,
        ...mcpData
      };
    } else {
      // Return error structure if mcpData indicates an error or is null
      return {
        query: query,
        error: (mcpData as any)?.error || "Geospatial tool failed to retrieve data.",
        details: (mcpData as any)?.details || "No further details available."
      };
    }
  }
});
