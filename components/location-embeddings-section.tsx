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
import { useEffect } from 'react'
import { useMapData } from '@/components/map/map-data-context'
import { buildLocationEmbeddingsMapUpdate } from '@/lib/utils/location-embeddings-map'

export type LocationEmbeddingsSectionProps = {
  result?: StreamableValue<string>
}

export function LocationEmbeddingsSection({ result }: LocationEmbeddingsSectionProps) {
  const [data, error, pending] = useStreamableValue(result)
  const { setMapData } = useMapData()

  let latitude: number | undefined
  let longitude: number | undefined
  let images: string[] = []
  let rawResultText = ''
  let hasError = false
  let parsedResultsList: any[] = []
  let parsedPayload: any

  if (data) {
    try {
      const parsedJson = JSON.parse(data)
      parsedPayload = parsedJson
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
            .slice(0, 3)
            .map((item: any, idx: number) => {
              const chipId = item.chip_id || item.chipId || item.id || `Chip #${idx + 1}`
              const collection = item.collection ? String(item.collection) : 'N/A'
              const dt = typeof item.datetime === 'string' ? item.datetime.split('T')[0] : 'N/A'
              const score =
                typeof item.score === 'number' && Number.isFinite(item.score)
                  ? item.score.toFixed(4)
                  : item.score ? String(item.score) : 'N/A'

              const c0 = item.centroid?.coordinates?.[0]
              const c1 = item.centroid?.coordinates?.[1]
              const latStr = typeof c1 === 'number' && Number.isFinite(c1) ? c1.toFixed(4) : c1
              const lngStr = typeof c0 === 'number' && Number.isFinite(c0) ? c0.toFixed(4) : c0
              const coords = c0 !== undefined && c1 !== undefined ? `[${latStr}, ${lngStr}]` : 'N/A'

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

  useEffect(() => {
    if (!data) return
    try {
      const update = buildLocationEmbeddingsMapUpdate(JSON.parse(data))
      if (!update) return
      setMapData(previous => {
        const mergedMarkers = new Map((previous.markers || []).map(marker => [marker.id, marker]))
        update.markers.forEach(marker => mergedMarkers.set(marker.id, marker))
        const mergedFeatures = new Map((previous.geoJsonFeatures || []).map(feature => [feature.id, feature]))
        update.features.forEach(feature => mergedFeatures.set(feature.id, feature))
        return {
          ...previous,
          ...(update.targetPosition ? { targetPosition: update.targetPosition } : {}),
          targetGeometry: update.targetGeometry || null,
          markers: Array.from(mergedMarkers.values()),
          geoJsonFeatures: Array.from(mergedFeatures.values())
        }
      })
    } catch {
      // Non-JSON stream updates are rendered as text but do not drive map state.
    }
  }, [data, setMapData])

  const flyToResult = (chipId: string) => {
    const update = buildLocationEmbeddingsMapUpdate(parsedPayload)
    const marker = update?.markers.find(item => item.id === `lgnd:chip:${chipId}`)
    if (!marker) return
    const feature = update?.features.find(item => item.id === marker.id)
    setMapData(previous => ({
      ...previous,
      targetPosition: { lat: marker.latitude, lng: marker.longitude },
      targetGeometry: feature?.geometry || null
    }))
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
            {parsedResultsList.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {parsedResultsList.slice(0, 3).map((item: any, idx: number) => {
                  const chipId = String(item.chip_id || item.chipId || item.id || `result-${idx + 1}`)
                  const hasLocation = buildLocationEmbeddingsMapUpdate(parsedPayload)?.markers.some(marker => marker.id === `lgnd:chip:${chipId}`)
                  if (!hasLocation) return null
                  return (
                    <button
                      key={chipId}
                      type="button"
                      onClick={() => flyToResult(chipId)}
                      className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                      aria-label={`Fly to LGND image ${chipId} on map`}
                    >
                      Fly to image {idx + 1}
                    </button>
                  )
                })}
              </div>
            )}
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
