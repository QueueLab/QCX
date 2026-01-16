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
            const coordRegex = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/g;
            const parts = [];
            let lastIndex = 0;
            let match;

            while ((match = coordRegex.exec(value)) !== null) {
              const lat = parseFloat(match[1]);
              const lng = parseFloat(match[2]);

              // Basic validation for lat/lng ranges
              if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
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
