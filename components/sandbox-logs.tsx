'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface LogEntry {
  type: 'stdout' | 'stderr'
  content: string
}

interface SandboxLogsProps {
  logs: LogEntry[]
  isExecuting?: boolean
}

export function SandboxLogs({ logs, isExecuting }: SandboxLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div
      ref={scrollRef}
      className="bg-zinc-950 text-zinc-50 font-mono text-sm p-4 rounded-md overflow-auto max-h-[300px] border border-zinc-800"
    >
      {logs.map((log, index) => (
        <div
          key={index}
          className={cn(
            "whitespace-pre-wrap mb-1",
            log.type === 'stderr' ? "text-red-400" : "text-zinc-300"
          )}
        >
          {log.content}
        </div>
      ))}
      {isExecuting && (
        <div className="flex items-center gap-2 text-zinc-500 mt-2">
          <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Executing...</span>
        </div>
      )}
      {logs.length === 0 && !isExecuting && (
        <div className="text-zinc-500 italic">No output</div>
      )}
    </div>
  )
}
