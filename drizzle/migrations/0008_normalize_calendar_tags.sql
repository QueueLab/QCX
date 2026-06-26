-- Create junction tables
CREATE TABLE IF NOT EXISTS "calendar_note_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL REFERENCES "calendar_notes"("id") ON DELETE cascade,
	"location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE cascade,
	CONSTRAINT "calendar_note_locations_note_location_unique" UNIQUE("note_id", "location_id")
);

CREATE TABLE IF NOT EXISTS "calendar_note_user_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL REFERENCES "calendar_notes"("id") ON DELETE cascade,
	"tag" text NOT NULL,
	CONSTRAINT "calendar_note_user_tags_note_tag_unique" UNIQUE("note_id", "tag")
);

-- Backfill location tags
-- Handles both single object and array of objects/IDs
INSERT INTO "calendar_note_locations" ("note_id", "location_id")
SELECT "id", (jsonb_array_elements("location_tags")->>'id')::uuid
FROM "calendar_notes"
WHERE "location_tags" IS NOT NULL AND jsonb_typeof("location_tags") = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO "calendar_note_locations" ("note_id", "location_id")
SELECT "id", ("location_tags"->>'id')::uuid
FROM "calendar_notes"
WHERE "location_tags" IS NOT NULL AND jsonb_typeof("location_tags") = 'object'
ON CONFLICT DO NOTHING;

-- Backfill user tags
INSERT INTO "calendar_note_user_tags" ("note_id", "tag")
SELECT "id", unnest("user_tags")
FROM "calendar_notes"
WHERE "user_tags" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old columns
ALTER TABLE "calendar_notes" DROP COLUMN IF EXISTS "location_tags";
ALTER TABLE "calendar_notes" DROP COLUMN IF EXISTS "user_tags";

-- Add RLS for junction tables
ALTER TABLE "calendar_note_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_access_own_calendar_note_locations" ON "calendar_note_locations"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "calendar_notes"
    WHERE "calendar_notes"."id" = "calendar_note_locations"."note_id"
    AND "calendar_notes"."user_id" = auth.uid()
  ));

ALTER TABLE "calendar_note_user_tags" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_access_own_calendar_note_user_tags" ON "calendar_note_user_tags"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "calendar_notes"
    WHERE "calendar_notes"."id" = "calendar_note_user_tags"."note_id"
    AND "calendar_notes"."user_id" = auth.uid()
  ));
