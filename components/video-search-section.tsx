'use client'

import { SearchSkeleton } from './search-skeleton'
import { Section } from './section'
import type { SerperSearchResults } from '@/lib/types'
import { VideoSearchResults } from './video-search-results'
import { ToolBadge } from './tool-badge'

export type VideoSearchSectionProps = {
  result?: string
}

export function VideoSearchSection({ result }: VideoSearchSectionProps) {
  let searchResults: SerperSearchResults | undefined
  let error: string | undefined

  if (result) {
    try {
      const parsed = JSON.parse(result)
      if (parsed.error) {
        error = parsed.error
      } else {
        searchResults = parsed
      }
    } catch (e) {
      error = 'Failed to parse video search results'
    }
  }

  return (
    <div>
      {error ? (
        <Section title="Video Search Error">
          <div className="text-destructive text-sm">{error}</div>
        </Section>
      ) : searchResults ? (
        <>
          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="search">{`${searchResults.searchParameters.q}`}</ToolBadge>
          </Section>
          <Section title="Videos">
            <VideoSearchResults results={searchResults} />
          </Section>
        </>
      ) : (
        <Section className="pt-2 pb-0">
          <SearchSkeleton />
        </Section>
      )}
    </div>
  )
}
