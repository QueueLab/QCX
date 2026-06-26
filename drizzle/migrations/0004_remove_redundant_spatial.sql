-- Convert existing geojson values into geometry for locations
UPDATE "locations"
SET "geometry" = ST_GeomFromGeoJSON("geojson"::text)
WHERE "geojson" IS NOT NULL AND "geometry" IS NULL;

-- Convert existing data values into geometry for visualizations (if they contain geometry)
UPDATE "visualizations"
SET "geometry" = ST_GeomFromGeoJSON("data"->>'geometry')
WHERE "data" IS NOT NULL AND "data"->>'geometry' IS NOT NULL AND "geometry" IS NULL;

-- Drop redundant column from locations
ALTER TABLE "locations" DROP COLUMN IF EXISTS "geojson";

-- Clean up redundant geometry overlap in visualizations.data
-- We keep the data column but remove the geometry key from the jsonb object
UPDATE "visualizations"
SET "data" = "data" - 'geometry'
WHERE "data" IS NOT NULL AND "data" ? 'geometry';
