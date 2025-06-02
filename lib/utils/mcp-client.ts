import { createSmitheryMCPProvider } from '@/mapbox_mcp/src/smithery-mcp-provider';
import { LanguageModelV1 } from '@ai-sdk/provider';

// Ensure API key is available server-side if this runs in a server context
// For NEXT_PUBLIC_ variables, they are available on the client, and also on the server during build time and SSR.
// If this tool is purely server-side and the API key is different or needs to be from process.env, adjust accordingly.
const apiKey = process.env.NEXT_PUBLIC_SMITHERY_API_KEY || process.env.SMITHERY_API_KEY;

if (!apiKey) {
  console.warn('SMITHERY_API_KEY is not set. Geospatial tool may not function.');
}

const smitheryProvider = createSmitheryMCPProvider({
  apiKey: apiKey || '', // Pass empty string if not found, provider might handle it or log error
});

export const smitheryModel: LanguageModelV1 = smitheryProvider('smithery-mcp-geospatial');

// You might also want to export the provider if other parts of the app need to create models with different IDs
// export { smitheryProvider };
