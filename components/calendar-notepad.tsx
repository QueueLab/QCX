"use client"

import type React from "react"
import { useActions } from 'ai/rsc'
import { AI } from '@/app/actions'
import { useState } from "react"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays, format, isSameDay, startOfDay } from "date-fns"
import { useMapData } from "./map/map-data-context"
import { Button } from "./ui/button"

interface Note {
  id: string
  date: Date
  content: string
  timestamp: Date
  locationTags?: any[]
  userTags?: string[]
}

export function CalendarNotepad() {
  const { mapData, setMapДata } = useMapData()
  const { saveCalendarNote, getChatId, saveNoteAsMessage } = useActions<typeof AI>()
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
  const [notes, setNotes] = useState<Note[]>([])
  const [noteContent, setNoteContent] = useState("")
  const [dateOffset, setDateOffset] = useState(0)
  const [taggedLocation, setTaggedLocation] = useState<any | null>(null)

  const generateDateRange = (offset: number) => {
    const today = startOfDay(new Date())
    const startDate = addDays(today, offset)
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  }

  const dateRange = generateDateRange(dateOffset)

  const filteredNotes = notes.filter((note) => isSameDay(note.date, selectedDate))

  const handleTagLocation = () => {
    const location = mapData.drawnFeatures && mapData.drawnFeatures.length > 0
      ? mapData.drawnFeatures
      : mapData.targetPosition;
    setTaggedLocation(location);
  };

  const handleAddNote = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      if (!noteContent.trim()) return

      const userTags = noteContent.match(/@\w+/g)?.map(tag => tag.substring(1)) || [];

      const newNote: Note = {
        id: Date.now().toString(),
        date: selectedDate,
        content: noteContent,
        timestamp: new Date(),
        locationTags: taggedLocation ? [taggedLocation] : [],
        userTags: userTags,
      }

      const result = await saveCalendarNote({
          date: newNote.date,
          content: newNote.content,
          locationTags: newNote.locationTags,
          userTags: newNote.userTags,
      });

      if ('error' in result) {
        console.error("Failed to save note:", result.error);
        return;
      }

      const chatId = await getChatId();
      if (chatId) {
        await saveNoteAsMessage(result, chatId);
      }

      setNotes([newNote, ...notes])
      setNoteContent("")
      setTaggedLocation(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <button onClick={() => setDateOffset(dateOffset - 7)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 gap-1">
          {dateRange.map((date, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded px-2 py-1.5 text-xs transition-colors",
                isSameDay(date, selectedDate)
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-medium">{format(date, "d")}</span>
              <span className="text-[10px] opacity-60">{format(date, "MMM")}</span>
            </button>
          ))}
        </div>

        <button onClick={() => setDateOffset(dateOffset + 7)} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border/50 p-4">
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          onKeyDown={handleAddNote}
          placeholder="Add note... (⌘+Enter to save, @mention, #location)"
          className="w-full resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          rows={2}
        />
        <div className="flex justify-end">
            <Button variant="ghost" size="icon" onClick={handleTagLocation}>
                <MapPin className={cn("h-4 w-4", taggedLocation ? "text-primary" : "text-muted-foreground")} />
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filteredNotes.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground/50">No notes</p>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div key={note.id} className="group">
                <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground/50">
                  <span>
                    {format(note.timestamp, "p")}
                  </span>
                  {note.locationTags && note.locationTags.length > 0 && (
                    <button onClick={() => {
                        const location = note.locationTags![0];
                        if (Array.isArray(location) && typeof location[0] === 'object') {
                            setMapData(prev => ({ ...prev, drawnFeatures: location as any, targetPosition: null }));
                        } else if (Array.isArray(location) && typeof location[0] === 'number') {
                            setMapData(prev => ({ ...prev, targetPosition: location as any, drawnFeatures: [] }));
                        }
                    }} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Location</span>
                    </button>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
