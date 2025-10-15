'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
// KaTeX CSS is already imported in layout.tsx
// import 'katex/dist/katex.min.css'

export function BotMessage({ content }: { content: StreamableValue<string> }) {
  const [data, error, pending] = useStreamableValue(content)

  // Currently, sometimes error occurs after finishing the stream.
  if (error) return <div>Error</div>

  //modify the content to render LaTeX equations
  const processedData = preprocessLaTeX(data || '')

  return (
    <div className="overflow-x-auto">
      <MemoizedReactMarkdown
        rehypePlugins={[
          [rehypeExternalLinks, { target: '_blank' }],
          [
            rehypeKatex,
            {
              throwOnError: false,
              output: 'html',
              strict: false,
              trust: true,
              macros: {
                '\\USD': '\\text{USD}'
              }
            }
          ]
        ]}
        remarkPlugins={[remarkGfm, remarkMath]}
        className="prose-sm prose-neutral prose-a:text-accent-foreground/50 math-content"
        components={{
          // Add custom components for math rendering
          math: ({ value }) => <div className="katex-display">{value}</div>,
          inlineMath: ({ value }) => (
            <span className="katex-inline">{value}</span>
          ),
          // Improve code block rendering
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className="bg-muted px-1 py-0.5 rounded text-sm"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                <code className="text-sm" {...props}>
                  {children}
                </code>
              </pre>
            )
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
  // First, handle display math with proper spacing
  let processedContent = content.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (_, equation) => `\n\n$$${equation.trim()}$$\n\n`
  )

  // Handle inline math with proper spacing
  processedContent = processedContent.replace(
    /\\\(([\s\S]*?)\\\)/g,
    (_, equation) => `$${equation.trim()}$`
  )

  // Fix common formatting issues with math expressions
  // Handle underscore formatting in math mode
  processedContent = processedContent.replace(
    /(\$\$?[^$]*?)_([^$]*?\$\$?)/g,
    (match, before, after) => `${before}\\_${after}`
  )

  // Fix spacing around math expressions
  processedContent = processedContent.replace(
    /([^\s])\$\$/g,
    (_, text) => `${text} $$`
  )

  processedContent = processedContent.replace(
    /\$\$([^\s])/g,
    (_, text) => `$$ ${text}`
  )

  // Fix specific pattern from the screenshot
  processedContent = processedContent.replace(
    /(\d+)USD\s*\)\s*\.([A-Za-z]+)vary/g,
    (_, amount, word) => `${amount} USD). ${word} vary`
  )

  // Fix spacing in roundtrip expressions
  processedContent = processedContent.replace(
    /(\d+)-(\d+)roundtrip\(plus/g,
    (_, start, end) => `${start}-${end} roundtrip (plus`
  )

  return processedContent
}
