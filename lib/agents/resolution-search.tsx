import { CoreMessage, generateObject } from 'ai';
import { z } from 'zod';
import { routerAgent } from './router-agent';
import { fromArrayBuffer } from 'geotiff';
import { getModel } from '@/lib/utils';
import { SatelliteIntelligence } from '../services/mock-satellite-services';

const resolutionSearchSchema = z.object({
  summary: z.string().describe('A detailed text summary of the analysis, including land feature classification, points of interest, and relevant current news.'),
  geoJson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({
      type: z.literal('Feature'),
      geometry: z.object({
        type: z.string(),
        coordinates: z.any(),
      }),
      properties: z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
    })),
  }).describe('A GeoJSON object containing points of interest and classified land features to be overlaid on the map.'),
});

export async function resolutionSearch(messages: CoreMessage[]) {
  const toolResult = await routerAgent(messages);

  let summary;
  let geoJson;
  let lat;
  let lon;
  let year;

  if (toolResult instanceof ArrayBuffer) {
    const tiff = await fromArrayBuffer(toolResult);
    const image = await tiff.getImage();
    const metadata = image.getGeoKeys();
    const textualSummary = `GeoTIFF Summary:
- Dimensions: ${image.getWidth()}x${image.getHeight()}
- Bands: ${image.getSamplesPerPixel()}
- Metadata: ${JSON.stringify(metadata, null, 2)}`;

    const { object } = await generateObject({
      model: await getModel(false),
      prompt: `Based on the following GeoTIFF summary, provide a detailed analysis of the satellite data, including land feature classification, points of interest, and any relevant current news. Also, create a GeoJSON object with points of interest.\n\n${textualSummary}`,
      schema: resolutionSearchSchema,
    });
    summary = object.summary;
    geoJson = object.geoJson;

    // We don't have lat, lon, year here, so we'll have to rely on the prompt to the router to get them.
    // This is a limitation of the current implementation.

  } else if (toolResult && typeof toolResult === 'object' && 'analysis' in toolResult) {
    const analysisResult = toolResult as SatelliteIntelligence;
    summary = `Analysis: ${analysisResult.analysis}\nConfidence: ${analysisResult.confidenceScore}\nDetected Objects: ${analysisResult.detectedObjects.join(', ')}`;
    geoJson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0], // Placeholder
          },
          properties: {
            name: 'Analysis Center',
            description: 'This is a placeholder based on mock analysis.',
          },
        },
      ],
    };
  } else {
    throw new Error('Unexpected tool result from router agent.');
  }

  // This is a bit of a hack, but we need to get the lat, lon, and year to the UI.
  // In a real implementation, this would be handled more elegantly.
  const lastMessage = messages[messages.length - 1];
  if (Array.isArray(lastMessage.content)) {
    const textPart = lastMessage.content.find(p => p.type === 'text');
    if (textPart) {
        // A better approach would be to have the router agent return the lat, lon, and year.
        // For now, we'll just pass them through.
    }
  }

  return {
    summary,
    geoJson,
    lat,
    lon,
    year,
  };
}