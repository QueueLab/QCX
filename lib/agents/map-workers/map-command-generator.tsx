import { generateObject } from 'ai';
import { getModel } from '@/lib/utils';
import {
  MapCommandGeneratorOutputSchema,
  MapCommandGeneratorOutput,
  GeoJSONFeatureCollection,
} from '@/lib/types/map-schemas';

const MAP_COMMAND_GENERATOR_PROMPT = `You are a specialized map command generation agent. Your task is to create appropriate Mapbox camera commands based on geographic data and user intent.

AVAILABLE COMMANDS:
1. flyTo: Smooth animated flight to a location
   - Use for: Single location focus, dramatic transitions
   - Params: center, zoom, pitch, bearing, speed, curve

2. easeTo: Smooth eased transition
   - Use for: Gentle movements, subtle adjustments
   - Params: center, zoom, pitch, bearing, duration

3. fitBounds: Fit map to bounding box
   - Use for: Multiple locations, routes, areas
   - Params: bounds [[west, south], [east, north]], padding

4. setCenter: Instantly set map center
   - Use for: Quick repositioning without animation
   - Params: center

5. setZoom: Instantly set zoom level
   - Use for: Quick zoom changes
   - Params: zoom (0-22)

RULES:
1. Choose commands based on context and user intent
2. For single locations: use flyTo with appropriate zoom
3. For multiple locations: use fitBounds to show all
4. For routes: use fitBounds with padding
5. Set appropriate zoom levels:
   - World view: 0-3
   - Country: 4-6
   - City: 10-12
   - Street: 14-16
   - Building: 17-20
6. Use pitch (0-85°) for 3D views when appropriate
7. Use bearing (0-360°) for orientation when relevant
8. Sequence commands with priority if multiple steps needed
9. Add descriptive reasoning for each command

CONTEXT AWARENESS:
- If current map state is provided, consider it
- Avoid unnecessary movements
- Optimize for user experience
- Balance between speed and smoothness

OUTPUT STRUCTURE:
- commands: Array of MapCommand objects with priority ordering
- reasoning: Explanation of command choices
- estimatedDuration: Total animation time in milliseconds`;

interface MapCommandGeneratorInput {
  text: string;
  geojson: GeoJSONFeatureCollection | null;
  currentMapState?: {
    center: [number, number];
    zoom: number;
    bounds: [[number, number], [number, number]];
  };
}

/**
 * Map Command Generator Worker Agent
 * Generates appropriate map commands based on geographic data and context
 */
export async function mapCommandGenerator(
  input: MapCommandGeneratorInput
): Promise<MapCommandGeneratorOutput> {
  const model = await getModel();

  try {
    // Build context string
    let contextString = `Text: ${input.text}\n\n`;
    
    if (input.geojson && input.geojson.features.length > 0) {
      contextString += `GeoJSON Features:\n`;
      input.geojson.features.forEach((feature, idx) => {
        contextString += `${idx + 1}. Type: ${feature.geometry.type}, `;
        contextString += `Properties: ${JSON.stringify(feature.properties)}\n`;
      });
      contextString += `\n`;
    }

    if (input.currentMapState) {
      contextString += `Current Map State:\n`;
      contextString += `- Center: [${input.currentMapState.center[0]}, ${input.currentMapState.center[1]}]\n`;
      contextString += `- Zoom: ${input.currentMapState.zoom}\n`;
      contextString += `- Bounds: ${JSON.stringify(input.currentMapState.bounds)}\n`;
    }

    const { object } = await generateObject({
      model,
      schema: MapCommandGeneratorOutputSchema,
      prompt: `${MAP_COMMAND_GENERATOR_PROMPT}\n\n${contextString}\n\nGenerate appropriate map commands for this context.`,
      maxTokens: 1536,
    });

    // Sort commands by priority if specified
    if (object.commands.length > 1) {
      object.commands.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    }

    // Calculate estimated duration if not provided
    if (!object.estimatedDuration && object.commands.length > 0) {
      object.estimatedDuration = object.commands.reduce((total, cmd) => {
        if (cmd.command === 'flyTo') {
          return total + (cmd.params.duration || 2000);
        } else if (cmd.command === 'easeTo') {
          return total + (cmd.params.duration || 1000);
        } else if (cmd.command === 'fitBounds') {
          return total + 1500;
        }
        return total + 500;
      }, 0);
    }

    return object;
  } catch (error) {
    console.error('Map Command Generator error:', error);
    
    // Fallback: Generate basic command based on GeoJSON
    if (input.geojson && input.geojson.features.length > 0) {
      const firstFeature = input.geojson.features[0];
      if (firstFeature.geometry.type === 'Point') {
        const [lon, lat] = firstFeature.geometry.coordinates as [number, number];
        return {
          commands: [{
            command: 'flyTo',
            params: {
              center: [lon, lat],
              zoom: 12,
              essential: true,
            },
            priority: 1,
          }],
          reasoning: 'Fallback: Flying to first point feature',
          estimatedDuration: 2000,
        };
      }
    }

    return {
      commands: [],
      reasoning: `Command generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      estimatedDuration: 0,
    };
  }
}
