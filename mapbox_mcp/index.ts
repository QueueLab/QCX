import type { Tool } from 'use-mcp/react';
import { useMcp } from 'use-mcp/react';


// Environment variables required by this script to connect to the Smithery-hosted MCP server.
// - SMITHERY_PROFILE_ID: Your Smithery profile ID.
// - SMITHERY_API_KEY: Your Smithery API key for authentication.
// Note: The Mapbox Access Token (MAPBOX_ACCESS_TOKEN) is configured on the server-side (on Smithery)
// and is not directly passed by this client script during the connection setup for this particular example.
const profileId = process.env.SMITHERY_PROFILE_ID;
const apiKey = process.env.SMITHERY_API_KEY;
const serverName = "mapbox-mcp-server"; // The unique name of your MCP server deployed on Smithery.

async function testMCPConnection() {
  // Check for required environment variables for Smithery connection.
  if (!profileId || !apiKey) {
    console.error("SMITHERY_PROFILE_ID and SMITHERY_API_KEY environment variables are required for this script.");
    return; // Return early if essential credentials are missing.
  }

  // Construct the server URL for SSE (Server-Sent Events) transport.
  const serverUrl = `https://server.smithery.ai/${serverName}/mcp?profile=${profileId}&api_key=${apiKey}`;
  
  // Declare client variable for cleanup in finally block.
  let client: any; // Type would ideally be defined by use-mcp's Node.js client type.

  try {
    // Log the connection attempt (masking API key for security).
    const urlToLog = serverUrl.split('?')[0] + `?profile=${profileId}&api_key=****`;
    console.log(`Attempting to connect to MCP server at ${urlToLog}...`);
    
    // Initialize the MCP client using createMcpClient (assumed Node.js equivalent of useMcp).
    client = await useMcp({
      url: serverUrl,
      autoReconnect: true,
      autoRetry: 5000,
      debug: process.env.NODE_ENV === 'development',
    });

    console.log("✅ Successfully connected to MCP server.");

    // Fetch and list available tools from the server.
    const tools = await client.tools();
    console.log("🛠️ Available tools:", tools.map((tool: Tool) => tool.name));

    // Perform a sample tool call if 'geocode_location' tool is available.
    if (tools.some((tool: Tool) => tool.name === 'geocode_location')) {
      console.log("\n📞 Attempting to call 'geocode_location' tool for 'Eiffel Tower'...");
      const geocodeParams = { query: "Eiffel Tower", includeMapPreview: true };
      try {
        const geocodeResult = await client.callTool('geocode_location', geocodeParams);
        
        // Parse the structured JSON from the tool result (assumes same server response format).
        let resultOutput = geocodeResult;
        if (Array.isArray(geocodeResult?.content) && geocodeResult.content.length > 0) {
          const lastContentItem = geocodeResult.content[geocodeResult.content.length - 1];
          if (lastContentItem && typeof lastContentItem.text === 'string') {
            const jsonMatch = lastContentItem.text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                resultOutput = JSON.parse(jsonMatch[1]);
              } catch (parseError) {
                console.warn("Could not parse JSON from tool result text block, logging raw text.");
                resultOutput = lastContentItem.text;
              }
            } else {
              resultOutput = geocodeResult.content.map((c: any) => c.text).join('\n');
            }
          }
        }
        console.log("🗺️ Geocode Result:", JSON.stringify(resultOutput, null, 2));
      } catch (toolError) {
        console.error("❌ Error calling 'geocode_location':", toolError);
      }
    } else {
      console.warn("⚠️ 'geocode_location' tool not found, skipping sample call.");
    }

  } catch (error) {
    console.error("❌ MCP connection or operation failed:", error);
  } finally {
    // Close the client connection if it exists.
    if (client) {
      console.log("\nClosing MCP client connection...");
      await client.close();
      console.log("🔌 Client connection closed.");
    }
  }
}

// Run the test connection function.
testMCPConnection();
