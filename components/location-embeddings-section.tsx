'use client'

import { Section } from './section'
import { ToolBadge } from './tool-badge'
import { SearchSkeleton } from './search-skeleton'
import { SearchResultsImageSection } from './search-results-image'
import { MemoizedReactMarkdown } from './ui/markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { cn } from '@/lib/utils'

export type LocationEmbeddingsSectionProps = {
  result?: StreamableValue<string>
}

export function LocationEmbeddingsSection({ result }: LocationEmbeddingsSectionProps) {
  const [data, error, pending] = useStreamableValue(result)

  let latitude: number | undefined
  let longitude: number | undefined
  let images: string[] = []
  let rawResultText = ''
  let hasError = false
  let parsedResultsList: any[] = []

  if (data) {
    try {
      const parsedJson = JSON.parse(data)
      latitude = parsedJson.latitude
      longitude = parsedJson.longitude
      if (Array.isArray(parsedJson.images)) {
        images = parsedJson.images
      }

      if (parsedJson.error) {
        hasError = true
        rawResultText = parsedJson.error
      } else {
        const rawRes = parsedJson.results
        if (Array.isArray(rawRes)) {
          parsedResultsList = rawRes
        } else if (rawRes && typeof rawRes === 'object') {
          if (Array.isArray(rawRes.data)) parsedResultsList = rawRes.data
          else if (Array.isArray(rawRes.results)) parsedResultsList = rawRes.results
          else if (Array.isArray(rawRes.items)) parsedResultsList = rawRes.items
          else if (Array.isArray(rawRes.chips)) parsedResultsList = rawRes.chips
        }

        if (parsedResultsList.length > 0) {
          rawResultText = parsedResultsList
            .slice(0, 10)
            .map((item: any, idx: number) => {
              const chipId = item.chip_id || item.chipId || item.id || `Chip #${idx + 1}`
              const collection = item.collection || 'N/A'
              const dt = item.datetime ? item.datetime.split('T')[0] : 'N/A'
              const score =
                typeof item.score === 'number'
                  ? item.score.toFixed(4)
                  : item.score || 'N/A'
              const coords = item.centroid?.coordinates
                ? `[${item.centroid.coordinates[1]?.toFixed(4)}, ${item.centroid.coordinates[0]?.toFixed(4)}]`
                : 'N/A'

              return `**${idx + 1}. ${chipId}**  \n• **Collection**: ${collection} | **Date**: ${dt} | **Score**: ${score} | **Centroid**: ${coords}`
            })
            .join('\n\n')
        } else if (parsedJson.formattedResult) {
          rawResultText = parsedJson.formattedResult
        } else {
          rawResultText = 'No location embedding matches found.'
        }
      }
    } catch {
      rawResultText = data
    }
  }

  if (error) {
    return (
      <div>
        <Section size="sm" className="pt-2 pb-0">
          <ToolBadge tool="locationEmbeddingsQuery">Location Embeddings Error</ToolBadge>
        </Section>
        <Section title="Error Details">
          <div className="text-destructive font-mono text-xs bg-destructive/10 p-3 rounded-lg border border-destructive/20">
            {(error as any).message || String(error)}
          </div>
        </Section>
      </div>
    )
  }

  const badgeText =
    latitude !== undefined && longitude !== undefined
      ? `Location Embeddings (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
      : `Location Embeddings Search`

  return (
    <div>
      {!pending && data ? (
        <>
          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="locationEmbeddingsQuery">{badgeText}</ToolBadge>
          </Section>

          {images && images.length > 0 && (
            <Section title="Satellite Thumbnails">
              <SearchResultsImageSection
                images={images}
                query={`Location Embeddings (${latitude}, ${longitude})`}
              />
            </Section>
          )}

          <Section title="Embeddings Results">
            <div
              className={cn(
                'overflow-x-auto',
                hasError
                  ? 'text-destructive font-mono text-xs bg-destructive/10 p-3 rounded-lg border border-destructive/20'
                  : ''
              )}
            >
              <MemoizedReactMarkdown
                rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }]]}
                remarkPlugins={[remarkGfm]}
                className="prose-sm prose-neutral prose-a:text-accent-foreground/50"
              >
                {rawResultText}
              </MemoizedReactMarkdown>
            </div>
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
