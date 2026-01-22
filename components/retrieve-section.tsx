import React from 'react'
import { Section } from '@/components/section'
import { SearchResults } from '@/components/search-results'
import { SearchResults as SearchResultsType } from '@/lib/types'

interface RetrieveSectionProps {
  data: SearchResultsType
}

const RetrieveSection: React.FC<RetrieveSectionProps> = ({ data }) => {
  if ((data as any).error) {
    return (
      <Section title="Retrieve Error">
        <div className="text-destructive text-sm">{(data as any).error}</div>
      </Section>
    )
  }

  return (
    <Section title="Sources">
      <SearchResults results={data.results} />
    </Section>
  )
}

export default RetrieveSection
