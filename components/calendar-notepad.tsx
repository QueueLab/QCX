"use client"

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { getNotes, saveNote } from "@/lib/actions/calendar"
import { useMapData } from "./map/map-data-context"
import type { CalendarNote, NewCalendarNote } from "@/lib/types"

interface CalendarNotepadProps {
  chatId?: string;
}

export function CalendarNotepad({ chatId }: CalendarNotepadProps) {
  const { mapData, setMapData } = useMapData()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const [noteContent, setNoteContent] = useState("")
  const [dateOffset, setDateOffset] = useState(0)
  const [taggedLocation, setTaggedLocation] = useState<any | null>(null)

  useEffect(() => {
    const fetchNotes = async () => {
      const fetchedNotes = await getNotes(selectedDate, chatId ?? null)
      setNotes(fetchedNotes)
    }
    fetchNotes()
  }, [selectedDate, chatId])

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

        const newNote: NewCalendarNote = {
            date: selectedDate,
            content: noteContent,
            chatId: chatId ?? null,
            userId: '', // This will be set on the server
            locationTags: taggedLocation,
            userTags: null,
            mapFeatureId: null,
            timezone: null,
        }

        const savedNote = await saveNote(newNote)
        if (savedNote) {
            setNotes([savedNote, ...notes])
            setNoteContent("")
            setTaggedLocation(null)
        }
    }
  }

  const handleTagLocation = () => {
    if (mapData.targetPosition) {
      setTaggedLocation({
        type: 'Point',
        coordinates: mapData.targetPosition
      });
      setNoteContent(prev => `${prev} #location`);
    }
  };

  const handleFlyTo = (location: any) => {
    if (location && location.coordinates) {
      setMapData(prev => ({ ...prev, targetPosition: location.coordinates }));
    }
  };

  return (
    <div data-testid="calendar-notepad" className="bg-card text-card-foreground shadow-lg rounded-lg p-4 max-w-2xl mx-auto my-4 border">
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
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <MapPin className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="p-3 bg-muted rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                </div>
                {note.locationTags && (
                  <button onClick={() => handleFlyTo(note.locationTags)} className="text-muted-foreground hover:text-foreground ml-2">
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
