'use client'

import { SearchResults } from './search-results'
import { SearchSkeleton } from './search-skeleton'
import { SearchResultsImageSection } from './search-results-image'
import { Section } from './section'
import { ToolBadge } from './tool-badge'
import type { SearchResults as TypeSearchResults } from '@/lib/types'

export type SearchSectionProps = {
  result?: string
}

export function SearchSection({ result }: SearchSectionProps) {
  let parsed: (TypeSearchResults & { error?: string }) | undefined
  if (result) {
    try {
      parsed = JSON.parse(result)
    } catch (e) {
      console.error('SearchSection: failed to parse result JSON', e)
    }
  }
  const searchResults = parsed && !('error' in parsed) ? parsed : undefined

  return (
    <div>
      {parsed && 'error' in parsed ? (
        <Section className="pt-2 pb-0">
          <p className="text-sm text-muted-foreground">{parsed.error}</p>
        </Section>
      ) : searchResults ? (
        <>
          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="search">{`${searchResults.query}`}</ToolBadge>
          </Section>
          {searchResults.images && searchResults.images.length > 0 && (
            <Section title="Images">
              <SearchResultsImageSection
                images={searchResults.images}
                query={searchResults.query}
              />
            </Section>
          )}
          <Section title="Sources">
            <SearchResults results={searchResults.results} />
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
