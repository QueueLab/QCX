'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { useAIState } from 'ai/rsc'
import { useMap } from './map/map-context'
import { useMapData } from './map/map-data-context'
import { generatePDFReport } from '@/lib/utils/report-generator'
import { AI } from '@/app/actions'
import { toast } from 'sonner'
import { ReportTemplate } from './report-template'
import { createPortal } from 'react-dom'

export const DownloadReportButton = () => {
  const [aiState] = useAIState<typeof AI>()
  const { map } = useMap()
  const { mapData } = useMapData()
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [mapSnapshot, setMapSnapshot] = useState<string | undefined>()

  const handleDownload = async () => {
    if (!aiState || aiState.messages.length === 0) {
      toast.error('No conversation to export')
      return
    }

    setIsGenerating(true)
    try {
      let snapshot: string | undefined
      if (map) {
        snapshot = map.getCanvas().toDataURL('image/png')
        setMapSnapshot(snapshot)
      }

      setShowTemplate(true)

      // Wait for React to render the template
      await new Promise(resolve => setTimeout(resolve, 500))

      let chatTitle = 'Untitled Chat'
      if (aiState.messages.length > 0) {
        const firstMessage = aiState.messages[0]
        if (typeof firstMessage.content === 'string') {
          try {
            const parsed = JSON.parse(firstMessage.content)
            chatTitle = parsed.input || firstMessage.content
          } catch (e) {
            chatTitle = firstMessage.content
          }
        }
      }
      const finalTitle = chatTitle.substring(0, 50)

      await generatePDFReport('report-template', finalTitle)

      toast.success('Report generated successfully')
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
      setShowTemplate(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDownload}
        disabled={isGenerating || !aiState || aiState.messages.length === 0}
        title="Download PDF Report"
        className="relative"
      >
        {isGenerating ? (
          <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
        ) : (
          <FileText className="h-[1.2rem] w-[1.2rem]" />
        )}
        <span className="sr-only">Download Report</span>
      </Button>

      {showTemplate && createPortal(
        <div
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '800px',
            zIndex: -1
          }}
        >
          <ReportTemplate
            messages={aiState.messages}
            drawnFeatures={mapData?.drawnFeatures}
            mapSnapshot={mapSnapshot}
            chatTitle="QCX Analysis Report"
          />
        </div>,
        document.body
      )}
    </>
  )
}
