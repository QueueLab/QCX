import { Feature } from 'geojson';

export interface McpResponseData {
  location: {
    latitude?: number;
    longitude?: number;
    place_name?: string;
    address?: string;
  };
  mapUrl?: string;
}

export interface ToolOutput {
  type: string;
  originalUserInput?: string;
  timestamp: string;
  mcp_response?: McpResponseData | null;
  features?: Feature[];
  error?: string | null;
}
