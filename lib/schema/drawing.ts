import { z } from 'zod';

// Basic GeoJSON types
const PointSchema = z.tuple([z.number(), z.number()]);
const LineStringSchema = z.array(PointSchema);
const PolygonSchema = z.array(LineStringSchema);

// GeoJSON Geometry Schemas
const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: PointSchema,
});

const LineStringGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: LineStringSchema,
});

const PolygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: PolygonSchema,
});

const GeometrySchema = z.union([
  PointGeometrySchema,
  LineStringGeometrySchema,
  PolygonGeometrySchema,
]);

// GeoJSON Feature Schema
const FeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeometrySchema,
  properties: z.record(z.any()).optional(),
});

// GeoJSON FeatureCollection Schema
const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema),
});

// The schema for the drawing tool, which will accept a FeatureCollection
export const drawingSchema = z.object({
  geojson: FeatureCollectionSchema.describe("A valid GeoJSON FeatureCollection object to be drawn on the map."),
});

export type Drawing = z.infer<typeof drawingSchema>;
