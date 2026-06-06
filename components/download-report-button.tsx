'use client'

import React, { useState, useEffect } from 'react'
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
  const [reportTitle, setReportTitle] = useState('QCX Analysis Report')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleDownload = async () => {
    if (!aiState || aiState.messages.length === 0) {
      toast.error('No conversation to export')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading('Generating report...')

    try {
      let snapshot: string | undefined
      if (map) {
        // Use a smaller snapshot if possible, or just the current canvas
        snapshot = map.getCanvas().toDataURL('image/jpeg', 0.5)
        setMapSnapshot(snapshot)
      }

      // Extract title
      let chatTitle = 'Untitled Chat'
      if (aiState.messages.length > 0) {
        const firstMessage = aiState.messages[0]
        const content = typeof firstMessage.content === 'string'
          ? firstMessage.content
          : Array.isArray(firstMessage.content)
            ? (firstMessage.content as any[]).map(p => p.type === 'text' ? p.text : '').join(' ')
            : ''

        try {
          const parsed = JSON.parse(content)
          chatTitle = parsed.input || content
        } catch (e) {
          chatTitle = content
        }
      }
      const finalTitle = (chatTitle || 'QCX Analysis Report').substring(0, 50)
      setReportTitle(finalTitle)

      setShowTemplate(true)

      // Short delay for React portal to mount
      await new Promise(resolve => setTimeout(resolve, 1200))

      await generatePDFReport('report-template', finalTitle)

      toast.success('Report generated successfully', { id: toastId })
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId })
    } finally {
      setIsGenerating(false)
      setShowTemplate(false)
      setMapSnapshot(undefined) // Clear snapshot memory
    }
  }

  if (!isMounted) return null

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
            zIndex: -1,
            backgroundColor: 'white',
            color: 'black'
          }}
        >
          <ReportTemplate
            messages={aiState.messages}
            drawnFeatures={mapData?.drawnFeatures}
            mapSnapshot={mapSnapshot}
            chatTitle={reportTitle}
          />
        </div>,
        document.body
      )}
    </>
  )
}
