/**
 * Elevation tool to fetch elevation data for a given location using Mapbox Tilequery API.
 */
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { z } from 'zod';

// Define the schema for the elevation tool's parameters
export const elevationQuerySchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  includeMap: z.boolean().optional().default(true).describe('Whether to include a map preview.'),
});

// Main elevation tool executor
export const elevationTool = ({ uiStream }: { uiStream: ReturnType<typeof createStreamableUI> }) => ({
  description: 'Use this tool to get the elevation for a specific location (latitude and longitude) using Mapbox.',
  parameters: elevationQuerySchema,
  execute: async (params: z.infer<typeof elevationQuerySchema>) => {
    const { latitude, longitude, includeMap } = params;
    const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    if (!mapboxAccessToken) {
      const errorMessage = 'Mapbox access token is not configured. This tool is unavailable.';
      uiFeedbackStream.done(errorMessage);
      return {
        type: 'ELEVATION_QUERY_RESULT',
        error: errorMessage,
      };
    }

    let feedbackMessage = `Processing elevation query for coordinates: ${latitude}, ${longitude}...`;
    uiFeedbackStream.update(feedbackMessage);

    let elevationData: {
      latitude: number;
      longitude: number;
      elevation: number;
      mapUrl?: string
    } | null = null;
    let toolError: string | null = null;

    try {
      const apiUrl = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${longitude},${latitude}.json?access_token=${mapboxAccessToken}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch elevation data from Mapbox. Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Find the highest elevation value from the contour features
        const maxElevation = data.features
          .filter((feature: any) => feature.properties && typeof feature.properties.ele !== 'undefined')
          .reduce((max: number, feature: any) => Math.max(max, feature.properties.ele), -Infinity);

        if (maxElevation === -Infinity) {
          throw new Error('No elevation data found in the response features.');
        }

        elevationData = { latitude, longitude, elevation: maxElevation };

        if (includeMap) {
          const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+285A98(${longitude},${latitude})/${longitude},${latitude},12,0/600x400?access_token=${mapboxAccessToken}`;
          elevationData.mapUrl = mapUrl;
        }

        feedbackMessage = `Elevation at ${latitude}, ${longitude}: ${maxElevation} meters.`;
        uiFeedbackStream.update(feedbackMessage);
      } else {
        throw new Error('No features returned from Mapbox for the given coordinates.');
      }
    } catch (error: any) {
      toolError = `Error fetching elevation data from Mapbox: ${error.message}`;
      uiFeedbackStream.update(toolError);
      console.error('[ElevationTool] Tool execution failed:', error);
    } finally {
      uiFeedbackStream.done();
    }

    return {
      type: 'ELEVATION_QUERY_RESULT',
      originalUserInput: JSON.stringify(params),
      timestamp: new Date().toISOString(),
      elevation_response: elevationData,
      error: toolError,
    };
  },
});
