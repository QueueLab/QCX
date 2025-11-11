'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './markdown'
import { motion } from 'framer-motion'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

export function StreamingMarkdown({
  content
}: {
  content: StreamableValue<string>
}) {
  const [data] = useStreamableValue(content)

  const processedData = preprocessLaTeX(data || '')

  const words = processedData.split(' ')

  return (
    <div className="overflow-x-auto">
      <MemoizedReactMarkdown
        rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }], rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        className="prose-sm prose-neutral prose-a:text-accent-foreground/50"
        components={{
          p: ({ children }) => {
            const words = String(children).split(' ')
            return (
              <p>
                {words.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.25,
                      delay: i * 0.05
                    }}
                  >
                    {word}{' '}
                  </motion.span>
                ))}
              </p>
            )
          },
          li: ({ children }) => {
            const words = String(children).split(' ')
            return (
              <li>
                {words.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.25,
                      delay: i * 0.05
                    }}
                  >
                    {word}{' '}
                  </motion.span>
                ))}
              </li>
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
