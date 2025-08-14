import { z } from 'zod';

// GeoJSON Position (longitude, latitude)
const PositionSchema = z.tuple([z.number(), z.number()]);

// Geometry Schemas
const PointSchema = z.object({
  type: z.literal('Point'),
  coordinates: PositionSchema,
});

const MultiPointSchema = z.object({
  type: z.literal('MultiPoint'),
  coordinates: z.array(PositionSchema),
});

const LineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(PositionSchema).min(2, { message: "LineString must have at least two positions." }),
});

const MultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(PositionSchema).min(2)),
});

// A LinearRing is a closed LineString with four or more positions.
const LinearRingSchema = z.array(PositionSchema).min(4, { message: "LinearRing must have at least four positions." })
  .refine(positions => {
    const first = positions[0];
    const last = positions[positions.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  }, { message: "The first and last positions of a LinearRing must be identical." });

const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(LinearRingSchema),
});

const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(LinearRingSchema)),
});

const GeometrySchema = z.union([
  PointSchema,
  MultiPointSchema,
  LineStringSchema,
  MultiLineStringSchema,
  PolygonSchema,
  MultiPolygonSchema,
]);

// Feature and FeatureCollection Schemas
const FeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeometrySchema,
  properties: z.record(z.string(), z.any()).nullable(),
});

const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema),
});

// The main schema for the drawing tool
export const drawingSchema = z.object({
  geojson: FeatureCollectionSchema.describe("A valid GeoJSON FeatureCollection object to be drawn on the map."),
});

export type Drawing = z.infer<typeof drawingSchema>;
