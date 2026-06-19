'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SandboxPreviewProps {
  url: string
}

export function SandboxPreview({ url }: SandboxPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [key, setKey] = useState(0)

  const reload = () => {
    setIsLoading(true)
    setKey(prev => prev + 1)
  }

  return (
    <div className="flex flex-col border rounded-md overflow-hidden bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="text-xs font-mono truncate mr-4">{url}</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
      <div className="relative w-full aspect-video bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          key={key}
          src={url}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  )
}
