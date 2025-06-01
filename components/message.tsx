'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'
import { useEffect, useState } from 'react'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

export function BotMessage({ content }: { content: StreamableValue<string> }) {
  const [data, error, pending] = useStreamableValue(content)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (data && !isVisible) {
      setIsVisible(true)
    }
  }, [data, isVisible])

  // Currently, sometimes error occurs after finishing the stream.
  if (error) return <div>Error</div>

  //modify the content to render LaTeX equations
  const processedData = preprocessLaTeX(data || '')

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out'
      }}
    >
      <MemoizedReactMarkdown
        rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }], rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        className="prose-sm prose-neutral prose-a:text-accent-foreground/50"
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
