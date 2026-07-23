import { z } from 'zod';

// Flat schema for the unified SkyFi MCP tool.
// This allows the AI agent to easily invoke various SkyFi satellite image tools
// with structured parameters.
export const skyfiQuerySchema = z.object({
  queryType: z.enum(['whoami', 'geocode', 'search', 'validate_order', 'place_order', 'list_orders'])
    .describe(
      "Type of SkyFi query to perform: " +
      "'whoami' → verify credentials and check budget; " +
      "'geocode' → convert a place name/location into a WKT polygon Area of Interest (AOI); " +
      "'search' → search the satellite archive catalog for latest images over an Area of Interest (AOI); " +
      "'validate_order' → validate and price a satellite image archive order (dry run); " +
      "'place_order' → place a billable satellite image order (only after user's explicit confirmation); " +
      "'list_orders' → list and track previous orders."
    ),
  location: z.string()
    .min(1)
    .optional()
    .describe("Location name or address to geocode (used by 'geocode' and optionally 'search')"),
  aoi: z.string()
    .min(1)
    .optional()
    .describe("WKT polygon representing the Area of Interest (AOI) (used by 'search', 'validate_order', 'place_order')"),
  orderId: z.string()
    .optional()
    .describe("ID of the order (used for tracking or placing orders)"),
  params: z.record(z.any())
    .optional()
    .describe("Additional optional parameters to pass directly to the corresponding SkyFi MCP tool (e.g. { gsd: 100, sensorType: 'DAY' } etc.)"),
  maxResults: z.number()
    .int()
    .positive()
    .optional()
    .default(5)
    .describe("Maximum number of results to return"),
});

export type SkyfiQuery = z.infer<typeof skyfiQuerySchema>;
