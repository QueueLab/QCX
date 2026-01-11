'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { Card } from '@/components/ui/card'

export const VideoUnderstandingSection = ({ result }: { result: StreamableValue<string | object> }) => {
  const [data, error] = useStreamableValue(result)

  if (error) {
    return (
      <Card className="p-4 mt-2 text-sm text-red-500">
        Error analyzing video: {(error as Error).message}
      </Card>
    );
  }

  if (!data) {
    return null
  }

  const analysisResult = typeof data === 'object' ? JSON.stringify(data, null, 2) : data

  return (
    <Card className="p-4 mt-2 text-sm">
      <h2 className="font-bold mb-2">Video Analysis</h2>
      <p>{analysisResult}</p>
    </Card>
  )
}
