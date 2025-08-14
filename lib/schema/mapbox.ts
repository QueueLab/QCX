import { z } from 'zod'

export const geocodingSchema = z.object({
  query: z.string().describe('The address or place name to geocode.'),
  includeMap: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include a map preview in the result.')
})

export const directionsSchema = z.object({
  origin: z.string().describe('The starting point for the directions.'),
  destination: z.string().describe('The ending point for the directions.'),
  profile: z
    .enum(['driving', 'walking', 'cycling'])
    .optional()
    .default('driving')
    .describe('The mode of transportation.')
})

export const matrixSchema = z.object({
  origins: z
    .array(z.string())
    .describe('An array of starting points, as addresses or coordinates.'),
  destinations: z
    .array(z.string())
    .describe('An array of ending points, as addresses or coordinates.'),
  profile: z
    .enum(['driving', 'walking', 'cycling'])
    .optional()
    .default('driving')
    .describe('The mode of transportation.')
})

export const isochroneSchema = z.object({
  location: z
    .string()
    .describe('The center point for the isochrone, as an address or coordinates.'),
  contour_minutes: z
    .number()
    .describe('The time in minutes to calculate the reachable area.'),
  profile: z
    .enum(['driving', 'walking', 'cycling'])
    .optional()
    .default('driving')
    .describe('The mode of transportation.')
})

export const staticImageSchema = z.object({
  center: z
    .string()
    .describe('The center of the map, as longitude,latitude.'),
  zoom: z.number().describe('The zoom level of the map.'),
  width: z.number().describe('The width of the image in pixels.'),
  height: z.number().describe('The height of the image in pixels.')
})
