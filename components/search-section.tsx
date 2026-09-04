'use client'

import { SearchResults } from './search-results'
import { SearchSkeleton } from './search-skeleton'
import { SearchResultsImageSection } from './search-results-image'
import { Section } from './section'
import { ToolBadge } from './tool-badge'
import type { SearchResults as TypeSearchResults } from '@/lib/types'
import { StreamableValue, useStreamableValue } from 'ai/rsc'

export type SearchSectionProps = {
  result?: StreamableValue<string>
}

export function SearchSection({ result }: SearchSectionProps) {
  const [data, error, pending] = useStreamableValue(result)

  let searchResults: TypeSearchResults | undefined = undefined
  let parseFailed = false

  if (data) {
    try {
      searchResults = JSON.parse(data)
      if (!searchResults || typeof searchResults !== 'object' || !Array.isArray(searchResults.results)) {
        parseFailed = true
      }
    } catch (e) {
      console.error('Failed to parse search results JSON:', e)
      parseFailed = true
    }
  }

  return (
    <div>
      {!pending && data ? (
        parseFailed || !searchResults ? (
          <Section size="sm" className="pt-2 pb-0">
            <div className="rounded-md border p-3 text-xs text-muted-foreground bg-muted/40">
              Unable to display search results.
            </div>
          </Section>
        ) : (
          <>
            <Section size="sm" className="pt-2 pb-0">
              <ToolBadge tool="search">{`${searchResults.query ?? ''}`}</ToolBadge>
            </Section>
            {searchResults.images && searchResults.images.length > 0 && (
              <Section title="Images">
                <SearchResultsImageSection
                  images={searchResults.images}
                  query={searchResults.query ?? ''}
                />
              </Section>
            )}
            <Section title="Sources">
              <SearchResults results={searchResults.results ?? []} />
            </Section>
          </>
        )
      ) : (
        <Section className="pt-2 pb-0">
          <SearchSkeleton />
        </Section>
      )}
    </div>
  )
}
