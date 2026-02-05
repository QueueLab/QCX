import { z } from 'zod';

export const drawingToolSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('polygon'),
    location: z.string().optional().describe('Name of the place to draw a polygon around'),
    coordinates: z.array(z.object({
      lat: z.number(),
      lng: z.number()
    })).optional().describe('List of coordinates for the polygon vertices'),
    label: z.string().optional().describe('Label for the polygon'),
    color: z.string().optional().describe('Color for the polygon (e.g., "#ff0000")')
  }),
  z.object({
    type: z.literal('line'),
    location: z.string().optional().describe('Name of the place to draw a line at'),
    coordinates: z.array(z.object({
      lat: z.number(),
      lng: z.number()
    })).optional().describe('List of coordinates for the line segments'),
    label: z.string().optional().describe('Label for the line'),
    color: z.string().optional().describe('Color for the line (e.g., "#0000ff")')
  }),
  z.object({
    type: z.literal('circle'),
    location: z.string().optional().describe('Name of the place to draw a circle around'),
    center: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional().describe('Center coordinates for the circle'),
    radius: z.number().describe('Radius of the circle'),
    units: z.enum(['meters', 'kilometers', 'miles', 'feet']).default('kilometers').describe('Units for the radius'),
    label: z.string().optional().describe('Label for the circle'),
    color: z.string().optional().describe('Color for the circle (e.g., "#00ff00")')
  })
]);

export type DrawingToolParams = z.infer<typeof drawingToolSchema>;
