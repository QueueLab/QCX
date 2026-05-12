'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown, Loader2 } from 'lucide-react'
import { useAIState } from 'ai/rsc'
import { useMapData } from '@/components/map/map-data-context'
import { useMap } from '@/components/map/map-context'
import { generateReport } from '@/lib/utils/report-generator'
import { toast } from 'sonner'

export function ReportSettings() {
  const [aiState] = useAIState()
  const { mapData } = useMapData()
  const { map } = useMap()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadReport = async () => {
    if (isGenerating) return

    setIsGenerating(true)
    try {
      const mapSnapshot = map ? map.getCanvas().toDataURL('image/png') : ''
      const chatTitle = aiState.chatId ? `Chat-${aiState.chatId.substring(0, 8)}` : 'QCX-Analysis'

      await generateReport({
        messages: aiState.messages,
        drawnFeatures: mapData.drawnFeatures || [],
        mapSnapshot,
        chatTitle
      })

      toast.success('Report generated successfully')
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription>
          Generate and download a PDF report of your current analysis session, including chat history, map snapshot, and drawn feature measurements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDownloadReport} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Download PDF Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}