'use client'

import { useStreamableValue, StreamableValue } from 'ai/rsc'
import { Section } from '@/components/section'
import { SandboxLogs } from './sandbox-logs'
import { SandboxPreview } from './sandbox-preview'
import { Terminal } from 'lucide-react'

interface LogEntry {
  type: 'stdout' | 'stderr'
  content: string
}

interface SandboxSectionProps {
  logs: StreamableValue<LogEntry[]>
  previewUrl?: string
  exitCode?: number
  error?: string
}

export function SandboxSection({ logs, previewUrl, exitCode, error }: SandboxSectionProps) {
  const [data, errorFromStream] = useStreamableValue(logs)
  const isExecuting = data === undefined

  return (
    <Section title="Sandbox" isCollapsed={false}>
      <div className="space-y-4">
        <SandboxLogs logs={data || []} isExecuting={isExecuting} />

        {previewUrl && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1">Live Preview</h4>
            <SandboxPreview url={previewUrl} />
          </div>
        )}

        {(error || !!errorFromStream) && (
          <div className="p-3 text-xs bg-red-50 text-red-600 rounded border border-red-100 font-mono">
            <strong>Error:</strong> {error || (errorFromStream as any)?.message || 'Execution failed'}
          </div>
        )}

        {exitCode !== undefined && !previewUrl && (
          <div className="text-[10px] text-muted-foreground font-mono px-1">
            Process exited with code {exitCode}
          </div>
        )}
      </div>
    </Section>
  )
}
