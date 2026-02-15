import React from 'react'
import { Section } from '@/components/section'
import { Card } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'

interface ManusSectionProps {
  data: {
    task_id: string
    task_title: string
    task_url: string
    share_url?: string
  }
}

const ManusSection: React.FC<ManusSectionProps> = ({ data }) => {
  return (
    <Section title="Manus Task">
      <Card className="p-4 space-y-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Task Title
          </div>
          <div className="text-base font-semibold">{data.task_title}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Task ID
          </div>
          <div className="text-sm font-mono text-muted-foreground">
            {data.task_id}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <a
            href={data.task_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View progress for task: ${data.task_title}`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            View Task Progress
          </a>

          {data.share_url && (
            <a
              href={data.share_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Public share link for task: ${data.task_title}`}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              Public Share Link
            </a>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          The Manus agent is working on your task. Click the link above to view
          real-time progress and results.
        </div>
      </Card>
    </Section>
  )
}

export default ManusSection
