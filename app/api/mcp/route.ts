import { createMcpHandler } from '@vercel/mcp-adapter';
import createMapboxServer from '@/mapbox_mcp/src/server'; // Adjust path as needed
import { configSchema } from '@/mapbox_mcp/src/server'; // Adjust path as needed

// Ensure environment variables are loaded
// For Vercel, environment variables are automatically available
// For local development, ensure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is in .env.local

const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (!mapboxAccessToken) {
  throw new Error("Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable");
}

const mcpConfig: import('zod').infer<typeof configSchema> = {
  mapboxAccessToken: mapboxAccessToken,
  debug: process.env.NODE_ENV === 'development', // Enable debug mode in development
};

// The createMapboxServer function initializes and returns the MCP server instance.
// We pass this server directly to the createMcpHandler.
const mapboxServerInstance = createMapboxServer({ config: mcpConfig });

const handler = createMcpHandler(
  () => mapboxServerInstance, // Pass the initialized server instance
  {
    // Optional server options from the MCP adapter documentation
    // No specific server options needed from mapbox_mcp based on its current setup
  },
  {
    // Optional MCP adapter config
    basePath: '/api/mcp', // Adjusted to match the route file's location
    maxDuration: 60, // Default from docs
    verboseLogs: process.env.NODE_ENV === 'development',
    // redisUrl: process.env.REDIS_URL, // No Redis for now
  }
);

// Export the handlers for GET and POST requests
export const GET = handler;
export const POST = handler;

// Optional: If you need to handle OPTIONS requests (e.g., for CORS)
// export const OPTIONS = adapter.handlers.OPTIONS;

export const dynamic = 'force-dynamic'; // Ensures the route is handled dynamically
