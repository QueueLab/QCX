import { drawingSchema } from '@/lib/schema/drawing';
import { createStreamableUI } from 'ai/rsc';

export const drawingTool = ({
  uiStream,
}: {
  uiStream: ReturnType<typeof createStreamableUI>;
}) => ({
  description: 'Draw GeoJSON features on the map. Use this tool to draw points, lines, and polygons.',
  parameters: drawingSchema,
  execute: async ({ geojson }: { geojson: any }) => {
    return {
      type: 'DRAWING',
      geojson,
    };
  },
});
