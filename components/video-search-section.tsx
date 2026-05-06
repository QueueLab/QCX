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
  if (result) {
    try {
      searchResults = JSON.parse(result)
    } catch (e) {
      console.error('VideoSearchSection: failed to parse result JSON', e)
    }
  }

  return (
    <div>
      {searchResults ? (
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
