import { z } from 'zod';

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const drawingToolSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('polygon'),
    location: z.string().optional().describe('Name of the place to draw a polygon around'),
    coordinates: z.array(coordinateSchema).min(3).optional().describe('List of coordinates for the polygon vertices'),
    label: z.string().optional().describe('Label for the polygon'),
    color: z.string().optional().describe('Color for the polygon (e.g., "#ff0000")')
  }),
  z.object({
    type: z.literal('line'),
    coordinates: z.array(coordinateSchema).min(2).describe('List of coordinates for the line segments'),
    label: z.string().optional().describe('Label for the line'),
    color: z.string().optional().describe('Color for the line (e.g., "#0000ff")')
  }),
  z.object({
    type: z.literal('circle'),
    location: z.string().optional().describe('Name of the place to draw a circle around'),
    center: coordinateSchema.optional().describe('Center coordinates for the circle'),
    radius: z.number().positive().describe('Radius of the circle'),
    units: z.enum(['meters', 'kilometers', 'miles', 'feet']).default('kilometers').describe('Units for the radius'),
    label: z.string().optional().describe('Label for the circle'),
    color: z.string().optional().describe('Color for the circle (e.g., "#00ff00")')
  })
]).refine(data => {
  if (data.type === 'circle') {
    return Boolean(data.location || data.center);
  }
  return true;
}, {
  message: 'Either location or center must be provided for circles'
});

export type DrawingToolParams = z.infer<typeof drawingToolSchema>;
