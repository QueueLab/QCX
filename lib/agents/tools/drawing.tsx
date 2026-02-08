import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { drawingToolSchema } from '@/lib/schema/drawing';
import { z } from 'zod';
import { getConnectedMcpClient, closeClient } from '@/lib/utils/mcp';
import * as turf from '@turf/turf';
import { Units } from "@turf/helpers";
import { ToolOutput } from '@/lib/types/tools';
import { Feature } from 'geojson';

export const drawingTool = ({
  uiStream
}: {
  uiStream: ReturnType<typeof createStreamableUI>
}) => ({
  description: `Use this tool to draw shapes on the map. You can draw polygons, lines, and circles.
  For example: "Draw a 5km circle around London", "Draw a polygon around Central Park", "Draw a line between New York and Boston".`,
  parameters: drawingToolSchema,
  execute: async (params: z.infer<typeof drawingToolSchema>): Promise<ToolOutput> => {
    const { type } = params;
    console.log('[DrawingTool] Execute called with:', params);

    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    let feedbackMessage = `Preparing to draw ${type}... Connecting to mapping service...`;
    uiFeedbackStream.update(feedbackMessage);

    const mcpClient = await getConnectedMcpClient();
    if (!mcpClient) {
      feedbackMessage = 'Drawing functionality is partially unavailable (geocoding failed). Please check configuration.';
      uiFeedbackStream.update(feedbackMessage);
      uiFeedbackStream.done();
      return { type: 'DRAWING_TRIGGER', timestamp: new Date().toISOString(), error: 'MCP client initialization failed' };
    }

    try {
      let features: Feature[] = [];
      let center: [number, number] | null = null;

      // Geocode location if provided (type-safe access)
      let locationToGeocode: string | undefined;
      if (params.type === 'polygon' || params.type === 'circle') {
        locationToGeocode = params.location;
      }

      if (locationToGeocode) {
        feedbackMessage = `Geocoding location: ${locationToGeocode}...`;
        uiFeedbackStream.update(feedbackMessage);

        const toolCallResult = await mcpClient.callTool(
          {
            name: 'forward_geocode_tool',
            arguments: { searchText: locationToGeocode, maxResults: 1 }
          },
          undefined,
          { timeout: 10000 }
        );

        // Guarded validation of geocoding response
        if (toolCallResult && Array.isArray(toolCallResult.content) && typeof toolCallResult.content[0]?.text === 'string') {
          const text = toolCallResult.content[0].text;
          try {
            const jsonMatch = text.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);
            const content = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text);

            if (content && Array.isArray(content.results) && content.results[0]?.coordinates) {
              const coords = content.results[0].coordinates;
              if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
                center = [coords.longitude, coords.latitude];
              }
            }
          } catch (parseError) {
            console.error('[DrawingTool] Failed to parse geocoding response:', parseError);
          }
        }
      }

      if (params.type === 'circle') {
        const circleCenter = params.center ? [params.center.lng, params.center.lat] : center;
        if (!circleCenter) throw new Error('Could not determine center for circle');

        feedbackMessage = `Generating circle around ${locationToGeocode || 'specified coordinates'} with radius ${params.radius} ${params.units}...`;
        uiFeedbackStream.update(feedbackMessage);

        const circle = turf.circle(circleCenter, params.radius, {
          units: params.units as Units,
          steps: 64,
          properties: {
            user_isCircle: true,
            user_radius: params.radius,
            user_radiusUnits: params.units,
            user_center: circleCenter,
            user_label: params.label,
            user_color: params.color
          }
        });
        features.push(circle);
      } else if (params.type === 'polygon') {
        const polyCoords = params.coordinates
          ? [params.coordinates.map((c: {lat: number, lng: number}) => [c.lng, c.lat])]
          : null;

        if (!polyCoords) {
           if (center) {
             const buffered = turf.buffer(turf.point(center), 0.5, { units: 'kilometers' });
             if (buffered) {
               buffered.properties = { ...buffered.properties, user_label: params.label, user_color: params.color };
               features.push(buffered as Feature);
             }
           } else {
             throw new Error('No coordinates or location provided for polygon');
           }
        } else {
          if (polyCoords[0][0][0] !== polyCoords[0][polyCoords[0].length-1][0] || polyCoords[0][0][1] !== polyCoords[0][polyCoords[0].length-1][1]) {
            polyCoords[0].push(polyCoords[0][0]);
          }
          const polygon = turf.polygon(polyCoords, {
            user_label: params.label,
            user_color: params.color
          });
          features.push(polygon);
        }
      } else if (params.type === 'line') {
        const lineCoords = params.coordinates.map((c: {lat: number, lng: number}) => [c.lng, c.lat]);

        const line = turf.lineString(lineCoords, {
          user_label: params.label,
          user_color: params.color
        });
        features.push(line);
      }

      feedbackMessage = `Successfully generated ${type} drawing.`;
      uiFeedbackStream.update(feedbackMessage);

      return {
        type: 'DRAWING_TRIGGER',
        originalUserInput: JSON.stringify(params),
        features,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      feedbackMessage = `Error generating drawing: ${error.message}`;
      uiFeedbackStream.update(feedbackMessage);
      console.error('[DrawingTool] Execution failed:', error);
      return { type: 'DRAWING_TRIGGER', timestamp: new Date().toISOString(), error: error.message };
    } finally {
      await closeClient(mcpClient);
      uiFeedbackStream.done();
    }
  }
});
