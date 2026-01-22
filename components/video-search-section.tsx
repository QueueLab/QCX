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
  const searchResults: SerperSearchResults = result ? JSON.parse(result) : undefined
  return (
    <div>
      {result ? (
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
