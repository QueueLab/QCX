import { Client, type ToolDefinition as SmitheryToolDefinition } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { z } from 'zod'; // For potential Zod schema generation if needed

const profileId = process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID;
const apiKey = process.env.NEXT_PUBLIC_SMITHERY_API_KEY || process.env.SMITHERY_API_KEY; // Also check non-public for server-side
const serverPath = process.env.NEXT_PUBLIC_SMITHERY_SERVER_PATH || '@ngoiyaeric/mapbox-mcp-server';

if (!profileId || !apiKey) {
  console.warn('Smithery Profile ID or API Key is not set. Smithery client may not function.');
}

const transport = new StreamableHTTPClientTransport(
  `https://server.smithery.ai/${serverPath}/mcp?profile=${profileId}&api_key=${apiKey}`
);

export const smitheryClient = new Client({
  name: "WebAppSmitheryClient",
  version: "1.0.0"
});

let isSmitheryConnected = false;
let connectionPromise: Promise<void> | null = null;

export async function connectSmithery(): Promise<void> {
  if (isSmitheryConnected && smitheryClient.connection?.status === 'connected') {
    return;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      if (smitheryClient.connection?.status !== 'connected') { // Check current status
        console.log('Attempting to connect to Smithery MCP server...');
        await smitheryClient.connect(transport);
      }
      isSmitheryConnected = true;
      console.log('Successfully connected to Smithery MCP server.');
    } catch (error) {
      console.error('Failed to connect to Smithery MCP server:', error);
      isSmitheryConnected = false; // Explicitly set on error
      connectionPromise = null; // Reset promise so next call retries
      throw error;
    }
  })();
  return connectionPromise;
}

// Define a more structured type for parameters, assuming JSON Schema-like
export interface SmitheryParameterSchema {
  type: string;
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
  description?: string; // For simple types like string directly under parameters
}

export interface SmitheryToolSchema {
   name: string;
   description: string;
   parameters: SmitheryParameterSchema;
}

export async function getSmitheryToolSchemas(): Promise<Record<string, SmitheryToolSchema>> {
  await connectSmithery();

  try {
    // TODO: Verify the actual method on smitheryClient to get schemas.
    // const schemas = await smitheryClient.getSchema();
    // This is a placeholder for the actual schema discovery mechanism.
    // if (schemas && typeof schemas === 'object' && Object.keys(schemas).length > 0) {
    //   return schemas as Record<string, SmitheryToolSchema>;
    // }

    console.warn("getSmitheryToolSchemas: Using hardcoded Smithery tool schemas. Dynamic discovery method needs verification with @modelcontextprotocol/sdk.");
    return {
      "geocode_location": {
        name: "geocode_location",
        description: "Geocodes an address (e.g., '1600 Amphitheatre Parkway, Mountain View, CA') to geographic coordinates.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The address or place name to geocode." },
            // includeMapPreview: { type: "boolean", description: "Whether to include a map preview URL in the response." }
          },
          required: ["query"]
        }
      },
      "calculate_distance": {
        name: "calculate_distance",
        description: "Calculates the distance and travel time between two locations.",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string", description: "The starting address or coordinates (lat,lon)." },
            to: { type: "string", description: "The destination address or coordinates (lat,lon)." },
            profile: { type: "string", description: "Mode of travel, e.g., 'driving', 'walking', 'cycling'." },
            // includeRouteMap: { type: "boolean", description: "Whether to include a route map URL." }
          },
          required: ["from", "to"]
        }
      },
      "search_nearby_places": {
        name: "search_nearby_places",
        description: "Searches for places (e.g., 'restaurants', 'coffee shops') near a specified location.",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string", description: "The center location for the search (address or lat,lon)." },
            query: { type: "string", description: "The type of place to search for (e.g., 'coffee', 'park')." },
            radius: { type: "number", description: "Search radius in meters." },
            // limit: { type: "number", description: "Maximum number of results to return." }
          },
          required: ["location", "query"]
        }
      },
    };
  } catch (error) {
    console.error("Error fetching/defining Smithery tool schemas:", error);
    // Fallback to empty or minimal schemas if critical
    return {};
  }
}

// Helper to convert JSON schema-like parameters to Zod. This is a simplified version.
export function smitheryParamsToZod(params: SmitheryParameterSchema): z.ZodTypeAny {
  if (params.type === 'object' && params.properties) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key in params.properties) {
      const prop = params.properties[key];
      let zodType: z.ZodTypeAny;
      switch (prop.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        default:
          zodType = z.any();
      }
      if (prop.description) {
        zodType = zodType.describe(prop.description);
      }
      if (!params.required?.includes(key)) {
        zodType = zodType.optional();
      }
      shape[key] = zodType;
    }
    return z.object(shape);
  } else if (params.type === 'string') { // For simple, direct parameter types
    let zodType = z.string();
    if (params.description) {
        zodType = zodType.describe(params.description);
    }
    return zodType;
  }
  // Add more types (array, enum, etc.) as needed
  return z.any().describe("Parameter schema type not fully supported by converter.");
}
