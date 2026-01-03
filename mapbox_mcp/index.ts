import { getComposioClient, initializeComposioMapbox } from './composio-mapbox';

// Environment variables required by this script to connect to Composio.
// - COMPOSIO_MAPBOX_AUTH_CONFIG_ID: Your Composio auth config ID for Mapbox.
// - COMPOSIO_USER_ID: Your user ID.
// - MAPBOX_ACCESS_TOKEN: Your Mapbox access token.
const authConfigId = process.env.COMPOSIO_MAPBOX_AUTH_CONFIG_ID;
const userId = process.env.COMPOSIO_USER_ID;
const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

async function testComposioConnection() {
  // Check for required environment variables for Composio connection.
  if (!authConfigId || !userId || !mapboxToken) {
    console.error("COMPOSIO_MAPBOX_AUTH_CONFIG_ID, COMPOSIO_USER_ID, and MAPBOX_ACCESS_TOKEN environment variables are required for this script.");
    return; // Return early if essential credentials are missing.
  }

  let composioClient: any;

  try {
    console.log(`Attempting to connect to Composio Mapbox...`);
    
    // Initialize the Composio client and authenticate
    const { connectionId, connectedAccount } = await initializeComposioMapbox();
    composioClient = getComposioClient();

    console.log("✅ Successfully connected to Composio Mapbox.");
    console.log("Connection ID:", connectionId);

    // Fetch and list available tools from Composio
    const tools = await composioClient.getTools({
      apps: ['mapbox']
    });
    console.log("🛠️ Available tools:", tools.map((tool: any) => tool.name));

    // Perform a sample tool call if 'mapbox_geocode_location' action is available.
    const geocodeAction = tools.find((tool: any) => tool.name === 'mapbox_geocode_location');
    if (geocodeAction) {
      console.log("\n📞 Attempting to call 'mapbox_geocode_location' action for 'Eiffel Tower'...");
      try {
        const geocodeResult = await composioClient.executeAction({
          action: 'mapbox_geocode_location',
          params: {
            query: "Eiffel Tower",
            includeMapPreview: true
          },
          connectedAccountId: connectionId,
        });
        
        console.log("🗺️ Geocode Result:", JSON.stringify(geocodeResult.data, null, 2));
      } catch (toolError) {
        console.error("❌ Error calling 'mapbox_geocode_location':", toolError);
      }
    } else {
      console.warn("⚠️ 'mapbox_geocode_location' action not found, skipping sample call.");
    }

  } catch (error) {
    console.error("❌ Composio connection or operation failed:", error);
  }
}

// Run the test connection function.
testComposioConnection();
