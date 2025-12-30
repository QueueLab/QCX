import { z } from 'zod';

// GeoJSON Schemas with strict validation
export const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
});

export const GeoJSONLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(
    z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ])
  ).min(2),
});

export const GeoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(
      z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ])
    ).min(4) // Polygons must have at least 4 coordinates (closed ring)
  ).min(1),
});

export const GeoJSONMultiPointSchema = z.object({
  type: z.literal('MultiPoint'),
  coordinates: z.array(
    z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ])
  ),
});

export const GeoJSONMultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(
    z.array(
      z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ])
    ).min(2)
  ),
});

export const GeoJSONMultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(
    z.array(
      z.array(
        z.tuple([
          z.number().min(-180).max(180),
          z.number().min(-90).max(90),
        ])
      ).min(4)
    ).min(1)
  ),
});

export const GeoJSONGeometrySchema = z.union([
  GeoJSONPointSchema,
  GeoJSONLineStringSchema,
  GeoJSONPolygonSchema,
  GeoJSONMultiPointSchema,
  GeoJSONMultiLineStringSchema,
  GeoJSONMultiPolygonSchema,
]);

export const GeoJSONFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeoJSONGeometrySchema,
  properties: z.record(z.any()).default({}),
  id: z.union([z.string(), z.number()]).optional(),
});

export const GeoJSONFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJSONFeatureSchema),
});

// Map Command Schemas
export const MapCommandParamsSchema = z.object({
  center: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]).optional(),
  zoom: z.number().min(0).max(22).optional(),
  pitch: z.number().min(0).max(85).optional(),
  bearing: z.number().min(0).max(360).optional(),
  bounds: z.tuple([
    z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  ]).optional(),
  duration: z.number().min(0).optional(),
  essential: z.boolean().optional(),
  speed: z.number().min(0).optional(),
  curve: z.number().min(0).optional(),
  padding: z.union([
    z.number(),
    z.object({
      top: z.number(),
      bottom: z.number(),
      left: z.number(),
      right: z.number(),
    }),
  ]).optional(),
});

export const MapCommandSchema = z.object({
  command: z.enum(['flyTo', 'easeTo', 'fitBounds', 'setCenter', 'setZoom', 'setPitch', 'setBearing']),
  params: MapCommandParamsSchema,
  priority: z.number().optional(),
  condition: z.string().optional(),
  description: z.string().optional(),
});

// Map State Feedback Schema
export const MapStateFeedbackSchema = z.object({
  success: z.boolean(),
  currentBounds: z.tuple([
    z.tuple([z.number(), z.number()]),
    z.tuple([z.number(), z.number()]),
  ]).optional(),
  currentCenter: z.tuple([z.number(), z.number()]).optional(),
  currentZoom: z.number().optional(),
  currentPitch: z.number().optional(),
  currentBearing: z.number().optional(),
  visibleFeatures: z.array(z.string()).optional(),
  error: z.string().optional(),
  timestamp: z.number(),
});

// Feedback Analysis Schema
export const FeedbackAnalysisSchema = z.object({
  status: z.enum(['success', 'partial', 'failed']),
  issues: z.array(z.string()),
  recommendations: z.object({
    action: z.enum(['retry', 'refine', 'abort', 'continue']),
    modifications: z.array(MapCommandSchema).optional(),
    reasoning: z.string().optional(),
  }),
});

// Worker Output Schemas
export const GeoJSONParserOutputSchema = z.object({
  geojson: GeoJSONFeatureCollectionSchema.nullable(),
  confidence: z.number().min(0).max(1),
  extractedLocations: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export const MapCommandGeneratorOutputSchema = z.object({
  commands: z.array(MapCommandSchema),
  reasoning: z.string().optional(),
  estimatedDuration: z.number().optional(),
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning']),
  })),
  warnings: z.array(z.string()).optional(),
});

// Orchestrator Classification Schema
export const QueryClassificationSchema = z.object({
  type: z.enum([
    'simple_location',      // Single location display
    'route_distance',       // Route or distance calculation
    'multi_location',       // Multiple locations
    'nearby_search',        // Search for nearby places
    'complex_operation',    // Complex multi-step operation
  ]),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  requiresMCP: z.boolean(),
  mcpOperations: z.array(z.enum([
    'geocode',
    'calculate_distance',
    'search_nearby',
    'generate_map_link',
  ])).optional(),
  reasoning: z.string(),
});

// Location Response Schema (enhanced)
export const LocationResponseSchema = z.object({
  text: z.string(),
  geojson: GeoJSONFeatureCollectionSchema.nullable(),
  map_commands: z.array(MapCommandSchema).nullable(),
  metadata: z.object({
    confidence: z.number().min(0).max(1).optional(),
    processingTime: z.number().optional(),
    mcpQueriesUsed: z.array(z.string()).optional(),
    iterationCount: z.number().optional(),
  }).optional(),
});

// Type exports
export type GeoJSONGeometry = z.infer<typeof GeoJSONGeometrySchema>;
export type GeoJSONFeature = z.infer<typeof GeoJSONFeatureSchema>;
export type GeoJSONFeatureCollection = z.infer<typeof GeoJSONFeatureCollectionSchema>;
export type MapCommand = z.infer<typeof MapCommandSchema>;
export type MapCommandParams = z.infer<typeof MapCommandParamsSchema>;
export type MapStateFeedback = z.infer<typeof MapStateFeedbackSchema>;
export type FeedbackAnalysis = z.infer<typeof FeedbackAnalysisSchema>;
export type GeoJSONParserOutput = z.infer<typeof GeoJSONParserOutputSchema>;
export type MapCommandGeneratorOutput = z.infer<typeof MapCommandGeneratorOutputSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type QueryClassification = z.infer<typeof QueryClassificationSchema>;
export type LocationResponse = z.infer<typeof LocationResponseSchema>;
