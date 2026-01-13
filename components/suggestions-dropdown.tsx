'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { PartialRelated } from '@/lib/schema/related'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SuggestionsDropdownProps {
  suggestions: PartialRelated | null
  onSelect: (query: string) => void
  onClose: () => void
  className?: string
}

export const SuggestionsDropdown: React.FC<SuggestionsDropdownProps> = ({
  suggestions,
  onSelect,
  onClose,
  className
}) => {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const suggestionItems = useMemo(
    () => suggestions?.items?.filter(item => item?.query) || [],
    [suggestions]
  )

  // Keyboard navigation
  useEffect(() => {
    if (suggestionItems.length === 0) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prevIndex =>
          prevIndex === suggestionItems.length - 1 ? 0 : prevIndex + 1
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prevIndex =>
          prevIndex <= 0 ? suggestionItems.length - 1 : prevIndex - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && suggestionItems[selectedIndex]) {
          onSelect(suggestionItems[selectedIndex].query!)
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [suggestionItems, selectedIndex, onSelect, onClose])

  // Click outside to close
  useEffect(() => {
    if (suggestionItems.length === 0) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose, suggestionItems.length])

  if (!suggestions || suggestionItems.length === 0) {
    return null
  }

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute bottom-full mb-2 w-full bg-background border border-border rounded-lg shadow-lg z-50',
        className
      )}
    >
      <div className="p-2">
        <p className="text-sm text-muted-foreground px-2 pb-1">Suggestions</p>
        {suggestionItems.map((item, index) => {
          if (!item?.query) return null
          return (
            <Button
              key={index}
              variant="ghost"
              className={cn(
                'w-full justify-start px-2 py-1 h-fit font-normal text-accent-foreground whitespace-normal text-left',
                selectedIndex === index && 'bg-accent'
              )}
              onClick={() => onSelect(item.query!)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
              {item.query}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default SuggestionsDropdown
