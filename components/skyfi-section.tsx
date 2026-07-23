'use client'

import { Section } from './section'
import { ToolBadge } from './tool-badge'
import { BotMessage } from './message'
import { SearchSkeleton } from './search-skeleton'
import { StreamableValue, useStreamableValue } from 'ai/rsc'

export type SkyfiSectionProps = {
  result?: StreamableValue<string>
}

export function SkyfiSection({ result }: SkyfiSectionProps) {
  const [data, error, pending] = useStreamableValue(result)

  let queryType = 'Query'
  let resultText = ''
  let hasError = false

  if (data) {
    try {
      const parsed = JSON.parse(data)
      queryType = parsed.queryType || 'Query'
      resultText = parsed.result || ''
      if (parsed.error) {
        hasError = true
        resultText = parsed.error
      }
    } catch {
      resultText = data
    }
  }

  return (
    <div>
      {!pending && data ? (
        <>
          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="skyfiQueryTool">{`SkyFi MCP: ${queryType}`}</ToolBadge>
          </Section>
          <Section title="Results">
            <div className={hasError ? "text-destructive font-mono text-xs bg-destructive/10 p-3 rounded-lg border border-destructive/20" : ""}>
              <BotMessage content={resultText} />
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
