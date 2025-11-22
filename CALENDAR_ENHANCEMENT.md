# Calendar UI Enhancement with Place/Time Context

## Overview

This enhancement adds comprehensive place and time context management to the QCX calendar system, integrating with Mapbox MCP to provide structured location and temporal information.

## Features

### 1. Enhanced Time Management
- **Time Picker**: Select specific time (HH:MM:SS) for calendar notes
- **Timezone Support**: Choose from 20+ common timezones
- **Auto-detection**: Automatically detects user's current timezone

### 2. Location Tagging with Mapbox MCP
- **Map Integration**: Tag notes with current map position
- **Geocoding**: Automatically fetches place names using Mapbox MCP
- **Visual Feedback**: Shows tagged coordinates in real-time

### 3. Structured Context Format
All location-tagged notes display context in the standardized format:
```
latitude, longitude TIME (HH:MM:SS): DD/MM/YYYY Timezone
```

Example:
```
40.758896, -73.985130 TIME (14:30:45): 20/11/2025 America/New_York
```

## Implementation Details

### Database Schema Changes

Added `timezone` field to `calendar_notes` table:
```sql
ALTER TABLE calendar_notes ADD COLUMN timezone VARCHAR(100);
```

### New Components

1. **CalendarNotepadEnhanced** (`components/calendar-notepad-enhanced.tsx`)
   - Enhanced version of the calendar notepad
   - Includes time and timezone selectors
   - Integrates with Mapbox MCP for geocoding

2. **Calendar Context Utilities** (`lib/utils/calendar-context.ts`)
   - `formatPlaceTimeContext()`: Formats notes into standardized context string
   - `parsePlaceTimeContext()`: Parses context strings back into components
   - `createGeoJSONPoint()`: Creates GeoJSON Point objects
   - `getCurrentTimezone()`: Gets user's current timezone
   - `COMMON_TIMEZONES`: List of 20+ common timezones

### Updated Files

- `lib/db/schema.ts`: Added timezone field
- `lib/types/index.ts`: Updated CalendarNote type
- `components/chat.tsx`: Switched to CalendarNotepadEnhanced
- `drizzle/migrations/0002_add_timezone_to_calendar_notes.sql`: Migration file

## Usage

### Creating a Note with Location and Time

1. Open the calendar view in QCX
2. Select the desired date from the date picker
3. Set the time using the time picker (defaults to current time)
4. Select the appropriate timezone
5. Navigate the map to your desired location
6. Click the MapPin icon to tag the location
7. Type your note content
8. Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to save

### Viewing Notes

Notes with location tags display:
- The note content
- A formatted context string with coordinates, time, date, and timezone
- A MapPin button to fly to the location on the map

### Mapbox MCP Integration

The calendar automatically integrates with Mapbox MCP when available:
- **Connected**: Automatically geocodes coordinates to place names
- **Disconnected**: Falls back to simple coordinate tagging

## API

### formatPlaceTimeContext(note: CalendarNote): string

Formats a calendar note into the standardized context string.

**Parameters:**
- `note`: CalendarNote object with locationTags

**Returns:**
- Formatted string: `"lat, lng TIME (HH:MM:SS): DD/MM/YYYY Timezone"`
- Empty string if no location tags

### parsePlaceTimeContext(contextString: string): object | null

Parses a context string back into components.

**Parameters:**
- `contextString`: Formatted context string

**Returns:**
```typescript
{
  latitude: number
  longitude: number
  time: string        // HH:MM:SS
  date: string        // DD/MM/YYYY
  timezone: string
}
```

## Supported Timezones

The system supports 20+ common timezones including:
- UTC
- Americas: New York, Chicago, Denver, Los Angeles, Toronto, Mexico City, São Paulo
- Europe: London, Paris, Berlin, Moscow
- Asia: Dubai, Kolkata, Shanghai, Tokyo, Seoul, Singapore
- Oceania: Sydney, Auckland

## Migration

To apply the database changes:

```bash
bun run db:migrate
```

Or manually run the migration:
```bash
psql -d your_database -f drizzle/migrations/0002_add_timezone_to_calendar_notes.sql
```

## Testing

The enhanced calendar can be tested by:
1. Creating notes with different times and timezones
2. Tagging locations from the map
3. Verifying the context string format
4. Flying to tagged locations
5. Testing with and without Mapbox MCP connection

## Future Enhancements

Potential improvements:
- Recurring events support
- Calendar export (iCal format)
- Time range queries
- Timezone conversion display
- Location-based note search
- Integration with external calendar services

## Dependencies

- Mapbox MCP server (optional, for enhanced geocoding)
- Mapbox GL JS (for map integration)
- Lucide React (for icons)
- Drizzle ORM (for database)

## Compatibility

- Works with existing calendar notes (timezone defaults to UTC)
- Backward compatible with original CalendarNotepad
- Mobile and desktop responsive
