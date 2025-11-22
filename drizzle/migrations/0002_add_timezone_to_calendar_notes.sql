-- Add timezone field to calendar_notes table
ALTER TABLE calendar_notes ADD COLUMN timezone VARCHAR(100);

-- Add comment for the timezone field
COMMENT ON COLUMN calendar_notes.timezone IS 'Timezone identifier (e.g., America/New_York, UTC, etc.)';
