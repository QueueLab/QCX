'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { useAIState } from 'ai/rsc'
import { useMap } from './map/map-context'
import { useMapData } from './map/map-data-context'
import { generatePDFReport } from '@/lib/utils/report-generator'
import { AI } from '@/app/actions'
import { useActions } from 'ai/rsc'
import { toast } from 'sonner'
import { ReportTemplate } from './report-template'
import { createPortal } from 'react-dom'

export const DownloadReportButton = () => {
  const [aiState] = useAIState<typeof AI>()
  const { map } = useMap()
  const { mapData } = useMapData()
  const actions = useActions<typeof AI>()
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [mapSnapshot, setMapSnapshot] = useState<string | undefined>()
  const [reportTitle, setReportTitle] = useState('QCX Analysis Report')
  const [reportSummary, setReportSummary] = useState<string | undefined>()
  const [strategicOutput, setStrategicOutput] = useState<string | undefined>()
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
    const toastId = toast.loading('Preparing report generation...')

    try {
      let snapshot: string | undefined
      if (map) {
        try {
          // preserveDrawingBuffer is true, so we can capture the canvas
          snapshot = map.getCanvas().toDataURL('image/png')
          setMapSnapshot(snapshot)
        } catch (e) {
          console.warn('Failed to capture map snapshot', e)
        }
      }

      // Generate AI summary and title
      toast.loading('Synthesizing intelligence findings...', { id: toastId })

      const formData = new FormData();
      formData.append('action', 'generate_report_context');
      formData.append('messages', JSON.stringify(aiState.messages));

      const { title, summary, strategicOutput } = await (actions as any).submit(formData);

      const finalTitle = title || 'QCX Intelligence Analysis'
      setReportTitle(finalTitle)
      setReportSummary(summary)
      setStrategicOutput(strategicOutput)

      // Step 1: Render template in portal
      setShowTemplate(true)

      // Step 2: Wait for DOM and React to synchronize
      // Using a longer timeout to ensure large images and complex content are rendered
      toast.loading('Rendering report elements...', { id: toastId })
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Step 3: Capture and Generate
      toast.loading('Capturing styled report...', { id: toastId })
      await generatePDFReport('report-template', finalTitle)

      toast.success('Report generated successfully', { id: toastId })
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId })
    } finally {
      setIsGenerating(false)
      setShowTemplate(false)
      setMapSnapshot(undefined)
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

      {/* Hidden container for PDF rendering - ensure it's in the DOM with appropriate styles */}
      {showTemplate && createPortal(
        <div
          id="pdf-render-container"
          style={{
            position: 'fixed',
            left: '-10000px',
            top: 0,
            width: '800px',
            zIndex: -9999,
            backgroundColor: 'white',
            color: 'black',
            visibility: 'visible',
            pointerEvents: 'none'
          }}
        >
          <ReportTemplate
            messages={aiState.messages}
            drawnFeatures={mapData?.drawnFeatures}
            mapSnapshot={mapSnapshot}
            chatTitle={reportTitle}
            aiSummary={reportSummary}
            strategicOutput={strategicOutput}
          />
        </div>,
        document.body
      )}
    </>
  )
}
