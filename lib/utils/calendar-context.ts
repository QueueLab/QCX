/**
 * Utility functions for formatting calendar context with place and time information
 */

import type { CalendarNote } from '@/lib/types'

/**
 * Formats a calendar note into a context string with the format:
 * latitude, longitude TIME (HH:MM:SS): DD/MM/YYYY Timezone
 * 
 * @param note - The calendar note to format
 * @returns Formatted context string or empty string if no location tags
 */
export function formatPlaceTimeContext(note: CalendarNote): string {
  if (!note.locationTags || !note.locationTags.coordinates) {
    return ''
  }
  
  const [lng, lat] = note.locationTags.coordinates
  const date = new Date(note.date)
  
  // Format time as HH:MM:SS
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  // Format date as DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  const timezone = note.timezone || 'UTC'
  
  return `${lat.toFixed(6)}, ${lng.toFixed(6)} TIME (${hours}:${minutes}:${seconds}): ${day}/${month}/${year} ${timezone}`
}

/**
 * Parses a place/time context string back into components
 * 
 * @param contextString - The formatted context string
 * @returns Object with parsed components or null if invalid format
 */
export function parsePlaceTimeContext(contextString: string): {
  latitude: number
  longitude: number
  time: string
  date: string
  timezone: string
} | null {
  // Match pattern: lat, lng TIME (HH:MM:SS): DD/MM/YYYY Timezone
  const pattern = /^([-\d.]+),\s*([-\d.]+)\s+TIME\s+\((\d{2}:\d{2}:\d{2})\):\s+(\d{2}\/\d{2}\/\d{4})\s+(.+)$/
  const match = contextString.match(pattern)
  
  if (!match) {
    return null
  }
  
  return {
    latitude: parseFloat(match[1]),
    longitude: parseFloat(match[2]),
    time: match[3],
    date: match[4],
    timezone: match[5]
  }
}

/**
 * Creates a GeoJSON Point object from coordinates
 * 
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns GeoJSON Point object
 */
export function createGeoJSONPoint(latitude: number, longitude: number): {
  type: 'Point'
  coordinates: [number, number]
} {
  return {
    type: 'Point',
    coordinates: [longitude, latitude]
  }
}

/**
 * Gets the current timezone of the user's browser
 * 
 * @returns IANA timezone identifier (e.g., 'America/New_York')
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Common timezone options for the timezone selector
 */
export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const

export type CommonTimezone = typeof COMMON_TIMEZONES[number]
