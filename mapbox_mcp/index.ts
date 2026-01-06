import { getComposioClient, initializeComposioMapbox } from './composio-mapbox';

async function testComposioConnection() {
  let composioClient: any;

  try {
    console.log(`Attempting to connect to Composio Mapbox...`);
    
    // Initialize the Composio client and authenticate
    // This will validate environment variables and throw if any are missing
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
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }
}

// Run the test connection function only if this file is executed directly
if (require.main === module) {
  testComposioConnection();
}

export { testComposioConnection };
