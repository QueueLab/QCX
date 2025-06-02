import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createSmitheryUrl } from "@smithery/sdk";

// Define and retrieve environment variables
const SMITHERY_PROFILE_ID = process.env.SMITHERY_PROFILE_ID;
const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY;
const MAPBOX_MCP_SERVER_NAME = process.env.MAPBOX_MCP_SERVER_NAME || "@ngoiyaeric/mapbox-mcp-server";
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// Check for required environment variables
if (!SMITHERY_PROFILE_ID) {
  throw new Error("Missing SMITHERY_PROFILE_ID environment variable");
}
if (!SMITHERY_API_KEY) {
  throw new Error("Missing SMITHERY_API_KEY environment variable");
}
if (!MAPBOX_ACCESS_TOKEN) {
  throw new Error("Missing MAPBOX_ACCESS_TOKEN environment variable");
}

// Construct the MCP server configuration object
const mcpServerConfig = {
  mapboxAccessToken: MAPBOX_ACCESS_TOKEN,
  debug: process.env.NODE_ENV === 'development', // Enable debug mode for MCP server in development
};

// Construct the Smithery server URL
const serverUrl = createSmitheryUrl(
  `https://server.smithery.ai/${MAPBOX_MCP_SERVER_NAME}`,
  {
    profile: SMITHERY_PROFILE_ID,
    apiKey: SMITHERY_API_KEY,
    config: mcpServerConfig
  }
);

// Create a StreamableHTTPClientTransport with the serverUrl
const transport = new StreamableHTTPClientTransport(serverUrl);

// Create and export a singleton Client instance using this transport
const mcpClient = new Client({ transport });

export default mcpClient;
