'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Clock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNotes, saveNote } from '@/lib/actions/calendar'
import type { CalendarNote, NewCalendarNote } from '@/lib/types'
import { useMapData } from '@/components/map/map-data-context'
import { useMapboxMCP } from '@/mapbox_mcp/hooks'
import { formatPlaceTimeContext, COMMON_TIMEZONES, getCurrentTimezone } from '@/lib/utils/calendar-context'

interface CalendarNotepadEnhancedProps {
  chatId?: string
}

export function CalendarNotepadEnhanced({ chatId }: CalendarNotepadEnhancedProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [dateOffset, setDateOffset] = useState(0)
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const [noteContent, setNoteContent] = useState('')
  const [taggedLocation, setTaggedLocation] = useState<any>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedTimezone, setSelectedTimezone] = useState(getCurrentTimezone())
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  
  const { mapData, setMapData } = useMapData()
  const { geocodeLocation, isConnected } = useMapboxMCP()

  useEffect(() => {
    const fetchNotes = async () => {
      const fetchedNotes = await getNotes(selectedDate, chatId ?? null)
      setNotes(fetchedNotes)
    }
    fetchNotes()
  }, [selectedDate, chatId])

  useEffect(() => {
    // Set current time as default
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    setSelectedTime(`${hours}:${minutes}:${seconds}`)
  }, [])

  const generateDateRange = (offset: number) => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + offset + i)
      dates.push(date)
    }
    return dates
  }

  const dateRange = generateDateRange(dateOffset)

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }



  const handleAddNote = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      if (!noteContent.trim()) return

      // Parse the selected time and combine with selected date
      const [hours, minutes, seconds] = selectedTime.split(':').map(Number)
      const noteDate = new Date(selectedDate)
      noteDate.setHours(hours, minutes, seconds || 0)

      const newNote: NewCalendarNote = {
        date: noteDate,
        content: noteContent,
        chatId: chatId ?? null,
        userId: '', // This will be set on the server
        locationTags: taggedLocation,
        userTags: null,
        mapFeatureId: null,
        timezone: selectedTimezone,
      }

      const savedNote = await saveNote(newNote)
      if (savedNote) {
        setNotes([savedNote, ...notes])
        setNoteContent("")
        setTaggedLocation(null)
      }
    }
  }

  const handleTagLocation = async () => {
    if (mapData.targetPosition) {
      setTaggedLocation({
        type: 'Point',
        coordinates: mapData.targetPosition
      })
      
      // Try to get place name using Mapbox MCP if connected
      if (isConnected) {
        setIsLoadingLocation(true)
        try {
          const [lng, lat] = mapData.targetPosition
          const result = await geocodeLocation(`${lng},${lat}`)
          if (result && result.place_name) {
            setNoteContent(prev => `${prev}\n📍 ${result.place_name}`)
          }
        } catch (error) {
          console.error('Error geocoding location:', error)
        } finally {
          setIsLoadingLocation(false)
        }
      } else {
        setNoteContent(prev => `${prev} #location`)
      }
    }
  }

  const handleFlyTo = (location: any) => {
    if (location && location.coordinates) {
      setMapData(prev => ({ ...prev, targetPosition: location.coordinates }))
    }
  }

  const timezones = COMMON_TIMEZONES

  return (
    <div data-testid="calendar-notepad-enhanced" className="bg-card text-card-foreground shadow-lg rounded-lg p-4 max-w-2xl mx-auto my-4 border">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setDateOffset(dateOffset - 7)}
          className="p-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex space-x-2 overflow-x-auto">
          {dateRange.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "flex flex-col items-center p-2 rounded-md transition-colors",
                isSameDay(date, selectedDate)
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              <span className="text-sm font-medium">
                {date.toLocaleDateString(undefined, { day: "numeric" })}
              </span>
              <span className="text-xs text-muted-foreground">
                {date.toLocaleDateString(undefined, { month: "short" })}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setDateOffset(dateOffset + 7)}
          className="p-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Time and Timezone Selection */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <input
            type="time"
            step="1"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="flex-1 p-2 bg-input rounded-md border focus:ring-ring focus:ring-2 focus:outline-none text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value)}
            className="flex-1 p-2 bg-input rounded-md border focus:ring-ring focus:ring-2 focus:outline-none text-sm"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={handleAddNote}
            placeholder="Add note... (⌘+Enter to save, @mention, #location)"
            className="w-full p-2 bg-input rounded-md border focus:ring-ring focus:ring-2 focus:outline-none pr-10"
            rows={3}
          />
          <button
            onClick={handleTagLocation}
            disabled={isLoadingLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Tag current map location"
          >
            <MapPin className="h-5 w-5" />
          </button>
        </div>
        {taggedLocation && (
          <div className="mt-2 text-xs text-muted-foreground">
            📍 Location tagged: {taggedLocation.coordinates[1].toFixed(6)}, {taggedLocation.coordinates[0].toFixed(6)}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="p-3 bg-muted rounded-md">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(note.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                  {note.locationTags && (
                    <div className="mt-2 text-xs font-mono text-primary bg-primary/10 p-2 rounded">
                      {formatPlaceTimeContext(note)}
                    </div>
                  )}
                </div>
                {note.locationTags && (
                  <button 
                    onClick={() => handleFlyTo(note.locationTags)} 
                    className="text-muted-foreground hover:text-foreground ml-2"
                    title="Fly to location on map"
                  >
                    <MapPin className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">
            No notes for this day.
          </p>
        )}
      </div>
    </div>
  )
}
