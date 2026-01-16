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
            // Improved regex to handle various coordinate formats:
            // - Decimal: 40.7128, -74.0060
            // - With degrees and suffixes: 65.2500° N, 52.7500° W
            // - With just degrees: 40.71° -74.00°
            const coordRegex = /(-?\d+(?:\.\d+)?)(°?\s*[NS]?|°)?[\s,°]+(-?\d+(?:\.\d+)?)(°?\s*[EW]?|°)?/gi;
            const parts = [];
            let lastIndex = 0;
            let match;

            while ((match = coordRegex.exec(value)) !== null) {
              let lat = parseFloat(match[1]);
              const latSuffix = match[2];
              let lng = parseFloat(match[3]);
              const lngSuffix = match[4];

              // Handle N/S/E/W suffixes
              if (latSuffix) {
                if (/S/i.test(latSuffix)) lat = -Math.abs(lat);
                else if (/N/i.test(latSuffix)) lat = Math.abs(lat);
              }
              if (lngSuffix) {
                if (/W/i.test(lngSuffix)) lng = -Math.abs(lng);
                else if (/E/i.test(lngSuffix)) lng = Math.abs(lng);
              }

              // Validation for lat/lng ranges and basic context to avoid false positives
              if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                const hasContext = !!(latSuffix || lngSuffix || match[0].includes('°') || match[0].includes(','));

                // Also check if it's just two plain numbers without decimal points - likely not coordinates unless context is strong
                const isPlainNumbers = !match[1].includes('.') && !match[3].includes('.');
                if (isPlainNumbers && !hasContext) continue;

                if (match.index > lastIndex) {
                  parts.push(value.substring(lastIndex, match.index));
                }
                parts.push(
                  <CoordinateLink
                    key={`${lat}-${lng}-${match.index}`}
                    lat={lat}
                    lng={lng}
                  />
                );
                lastIndex = coordRegex.lastIndex;
              }
            }

            if (lastIndex < value.length) {
              parts.push(value.substring(lastIndex));
            }

            return <>{parts.length > 0 ? parts : value}</>;
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
