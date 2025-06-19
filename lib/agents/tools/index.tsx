import { createStreamableUI } from 'ai/rsc'
import { retrieveTool } from './retrieve'
import { searchTool } from './search'
import { videoSearchTool } from './video-search'
import { geospatialTool } from './geospatial'; // Added import

export interface UserLocation {
  latitude: number;
  longitude: number;
  place_name?: string;
}

export interface ToolProps {
  uiStream: ReturnType<typeof createStreamableUI>;
  fullResponse: string;
  currentUserLocation?: UserLocation;
  // We might also need the original user query or reason_for_request here
  // if geospatialTool's augmentation logic is to be very smart.
  // For now, let's stick to currentUserLocation.
}

export const getTools = ({ uiStream, fullResponse, currentUserLocation }: ToolProps) => {
  const tools: any = {
    search: searchTool({
      uiStream,
      fullResponse,
      currentUserLocation
    }),
    retrieve: retrieveTool({ // retrieveTool typically doesn't need location.
      uiStream,
      fullResponse
      // currentUserLocation // Not passing for retrieve unless a use case emerges
       }),
       geospatialQueryTool: geospatialTool({
         uiStream,
         fullResponse,
         currentUserLocation
    }),
    request_user_location_tool: {
      description: "Use this tool when the user's query implies a need for their current location (e.g., 'near me', 'weather here', 'closest coffee shop'). Include the part of the user's query that indicates the need for location in the reason_for_request.",
      parameters: {
        type: "object",
        properties: {
          reason_for_request: {
            type: "string",
            description: "Brief reason why user's location is needed, quoting or summarizing the relevant part of the user's query."
          }
        },
        required: ["reason_for_request"]
      },
      execute: async ({ reason_for_request }: { reason_for_request: string }) => {
        // This execute function should ideally not be called if researcher.tsx intercepts the tool_call.
        // If it is called, it means the interception failed or was not implemented.
        console.error(`ERROR: request_user_location_tool.execute was called with reason: ${reason_for_request}. This indicates an issue with researcher.tsx tool call handling.`);
        // Return a generic error or a specific marker that can be handled if needed.
        return {
          type: "ERROR_UNEXPECTED_TOOL_EXECUTION",
          message: "Location request tool was executed directly instead of being intercepted by the researcher agent."
        };
      }
    }
  }

  if (process.env.SERPER_API_KEY) {
    tools.videoSearch = videoSearchTool({
      uiStream,
      fullResponse
    })
  }

  return tools
}
