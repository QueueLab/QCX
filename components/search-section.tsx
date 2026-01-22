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
  let searchResults: TypeSearchResults | undefined
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
      error = 'Failed to parse search results'
    }
  }

  return (
    <div>
      {error ? (
        <Section title="Search Error">
          <div className="text-destructive text-sm">{error}</div>
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
