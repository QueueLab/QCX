import { createMcpHandler } from '@vercel/mcp-adapter';
import { MapboxServer } from '@/mapbox_mcp/src/server/main';

// It's assumed that MapboxServer and its handlers will pick up
// MAPBOX_ACCESS_TOKEN from process.env if needed.
// The check for mapboxAccessToken can remain as a safeguard for the app.
const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;
if (!mapboxAccessToken) {
  // This error will stop the app from building/starting if the token isn't set,
  // which is good, even if MapboxServer itself might also check for it.
  throw new Error("Missing MAPBOX_ACCESS_TOKEN environment variable for the API route setup.");
}

const mapboxServer = new MapboxServer();
const mcpInstance = mapboxServer.getMcpServer();

const handler = createMcpHandler(
  () => mcpInstance, // Pass the initialized server instance from MapboxServer
  {
    // Optional server options from the MCP adapter documentation
  },
  {
    // Optional MCP adapter config
    basePath: '/api/mcp', // Matches the route file's location
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === 'development',
  }
);

export { handler as GET, handler as POST };
export const dynamic = 'force-dynamic';
