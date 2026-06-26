-- Delete existing synthetic calendar-note rows from messages
DELETE FROM "messages"
WHERE "role" = 'data'
AND "content"::jsonb->>'type' = 'calendar_note';
