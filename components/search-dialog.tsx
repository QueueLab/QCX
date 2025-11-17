"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Clock, FileText, Users, Settings } from "lucide-react"
import { searchActivity } from "@/app/actions/profile-actions"
import type { SearchResult } from "@/lib/types"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      return
    }

    // Load recent activity when dialog opens
    async function loadRecent() {
      setLoading(true)
      const response = await searchActivity("")
      if (response.results) {
        setResults(response.results)
      }
      setLoading(false)
    }

    loadRecent()
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      const response = await searchActivity(query)
      if (response.results) {
        setResults(response.results)
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "session":
        return <Clock className="w-4 h-4" />
      case "document":
        return <FileText className="w-4 h-4" />
      case "meeting":
        return <Users className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-background/90 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Search</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search your activity..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-muted/50 backdrop-blur-sm border-border text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {!query && <p className="text-sm text-muted-foreground px-2 py-1">Recent Activity</p>}
              {results.map((result) => (
                <Button
                  key={result.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 text-left hover:bg-accent/50 backdrop-blur-sm"
                  onClick={() => {
                    onOpenChange(false)
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-1 text-muted-foreground">{getActivityIcon(result.activity_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{result.title}</p>
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">{formatDate(result.created_at)}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          ) : query ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              Type <kbd className="px-1 py-0.5 bg-muted/50 backdrop-blur-sm rounded">#</kbd> to access summaries
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-muted/50 backdrop-blur-sm rounded">?</kbd> for help
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
