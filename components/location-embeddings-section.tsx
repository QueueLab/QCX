'use client'

import { Section } from './section'
import { ToolBadge } from './tool-badge'
import { SearchSkeleton } from './search-skeleton'
import { MemoizedReactMarkdown } from './ui/markdown'
import { SearchResultsImageSection } from './search-results-image'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { cn } from '@/lib/utils'

export type LocationEmbeddingsSectionProps = {
  result?: StreamableValue<string>
}

type ImageResult = { url: string; description?: string }

export function LocationEmbeddingsSection({ result }: LocationEmbeddingsSectionProps) {
  const [data, error, pending] = useStreamableValue(result)
  let latitude: number | undefined
  let longitude: number | undefined
  let rawResultText = ''
  let images: ImageResult[] = []
  let hasError = false

  if (data) {
    try {
      const parsedJson = JSON.parse(data)
      latitude = parsedJson.latitude
      longitude = parsedJson.longitude

      if (Array.isArray(parsedJson.images)) {
        images = parsedJson.images.filter(
          (image: unknown): image is ImageResult =>
            !!image &&
            typeof image === 'object' &&
            typeof (image as ImageResult).url === 'string'
        )
      }

      if (parsedJson.error) {
        hasError = true
        rawResultText = parsedJson.error
      } else if (parsedJson.formattedResult) {
        rawResultText = parsedJson.formattedResult
      } else {
        rawResultText = JSON.stringify(parsedJson, null, 2)
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
            {(error as Error).message || String(error)}
          </div>
        </Section>
      </div>
    )
  }

  const badgeText =
    latitude !== undefined && longitude !== undefined
      ? `Location Embeddings (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
      : 'Location Embeddings Search'

  return (
    <div>
      {!pending && data ? (
        <>
          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="locationEmbeddingsQuery">{badgeText}</ToolBadge>
          </Section>
          {!hasError && images.length > 0 && (
            <Section title="Satellite imagery">
              <SearchResultsImageSection
                images={images.map(image => image.url)}
                query="LGND location embeddings thumbnails"
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
