'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { CoordinateLink } from './map/coordinate-link'

export function BotMessage({ content }: { content: StreamableValue<string> }) {
  const [data, error, pending] = useStreamableValue(content)

  // Currently, sometimes error occurs after finishing the stream.
  if (error) return <div>Error</div>

  //modify the content to render LaTeX equations
  const processedData = preprocessLaTeX(data || '')

  return (
    <div className="overflow-x-auto">
      <MemoizedReactMarkdown
        rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }], rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        className="prose-sm prose-neutral prose-a:text-accent-foreground/50"
        components={{
          text: (props) => {
            const { children } = props;
            if (typeof children !== 'string') return <>{children}</>;
            const value = children;

            // Highly inclusive regex for coordinates:
            // Matches numbers with optional degrees/ordinal indicators and N/S/E/W suffixes.
            const coordRegex = /(-?\d+(?:\.\d+)?)\s*[°\u00B0\u00BA]?\s*([NS])?[\s,°\u00B0\u00BA]+(-?\d+(?:\.\d+)?)\s*[°\u00B0\u00BA]?\s*([EW])?/gi;

            const parts = [];
            let lastIndex = 0;
            const matches = Array.from(value.matchAll(coordRegex));

            for (const match of matches) {
              const fullMatch = match[0];
              let lat = parseFloat(match[1]);
              const latSuffix = match[2];
              let lng = parseFloat(match[3]);
              const lngSuffix = match[4];

              // Apply suffixes
              if (latSuffix) {
                if (latSuffix.toUpperCase() === 'S') lat = -Math.abs(lat);
                else if (latSuffix.toUpperCase() === 'N') lat = Math.abs(lat);
              }
              if (lngSuffix) {
                if (lngSuffix.toUpperCase() === 'W') lng = -Math.abs(lng);
                else if (lngSuffix.toUpperCase() === 'E') lng = Math.abs(lng);
              }

              // Validate range
              if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                // Ensure we have some context (suffix, comma, or degree symbol) to avoid matching arbitrary pairs of numbers
                const hasContext = !!(latSuffix || lngSuffix || fullMatch.includes('°') || fullMatch.includes('\u00B0') || fullMatch.includes('\u00BA') || fullMatch.includes(','));
                const isDecimal = match[1].includes('.') || match[3].includes('.');

                if (hasContext || isDecimal) {
                  if (match.index! > lastIndex) {
                    parts.push(value.substring(lastIndex, match.index!));
                  }
                  parts.push(
                    <CoordinateLink
                      key={`${lat}-${lng}-${match.index!}`}
                      lat={lat}
                      lng={lng}
                      label={fullMatch}
                    />
                  );
                  lastIndex = match.index! + fullMatch.length;
                }
              }
            }

            if (parts.length === 0) return <>{value}</>;

            if (lastIndex < value.length) {
              parts.push(value.substring(lastIndex));
            }

            return <>{parts}</>;
          }
        }}
      >
        {processedData}
      </MemoizedReactMarkdown>
    </div>
  )
}

// Preprocess LaTeX equations to be rendered by KaTeX
// ref: https://github.com/remarkjs/react-markdown/issues/785
const preprocessLaTeX = (content: string) => {
  const blockProcessedContent = content.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (_, equation) => `$$${equation}$$`
  )
  const inlineProcessedContent = blockProcessedContent.replace(
    /\\\(([\s\S]*?)\\\)/g,
    (_, equation) => `$${equation}$`
  )
  return inlineProcessedContent
}
