'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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

  // Holds the callback that runs the PDF generation once the portal is in the DOM.
  const pendingGenerateRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // When showTemplate flips to true, React has committed the portal to the DOM
  // but the browser hasn't necessarily painted yet.  A double requestAnimationFrame
  // ensures we wait for the next paint before calling html2canvas so that the
  // element is actually in the DOM and fully laid out.
  useEffect(() => {
    if (!showTemplate) return
    const callback = pendingGenerateRef.current
    if (!callback) return

    let raf1: number
    let raf2: number

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        callback()
        pendingGenerateRef.current = null
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [showTemplate])

  const handleDownload = useCallback(async () => {
    if (!aiState || aiState.messages.length === 0) {
      toast.error('No conversation to export')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading('Generating report...')

    try {
      let snapshot: string | undefined
      if (map) {
        snapshot = map.getCanvas().toDataURL('image/jpeg', 0.5)
        setMapSnapshot(snapshot)
      }

      // Derive a title from the first message's text content.
      let chatTitle = 'Untitled Chat'
      if (aiState.messages.length > 0) {
        const firstMessage = aiState.messages[0]
        const rawContent =
          typeof firstMessage.content === 'string'
            ? firstMessage.content
            : Array.isArray(firstMessage.content)
            ? (firstMessage.content as any[])
                .map((p: any) => (p.type === 'text' ? p.text : ''))
                .join(' ')
            : ''

        try {
          const parsed = JSON.parse(rawContent)
          chatTitle = parsed.input || rawContent
        } catch {
          chatTitle = rawContent
        }
      }
      const finalTitle = (chatTitle || 'QCX Analysis Report').substring(0, 50)
      setReportTitle(finalTitle)

      // Store the PDF generation work in a ref so the useEffect can run it
      // after React has committed the portal and the browser has painted.
      pendingGenerateRef.current = async () => {
        try {
          await generatePDFReport('report-template', finalTitle)
          toast.success('Report generated successfully', { id: toastId })
        } catch (error) {
          console.error('Failed to generate report:', error)
          toast.error('Failed to generate report', { id: toastId })
        } finally {
          setIsGenerating(false)
          setShowTemplate(false)
          setMapSnapshot(undefined)
        }
      }

      // Trigger the portal render; the useEffect above will fire once React
      // commits this state change and two animation frames have elapsed.
      setShowTemplate(true)
    } catch (error) {
      console.error('Failed to prepare report:', error)
      toast.error('Failed to generate report', { id: toastId })
      setIsGenerating(false)
      setShowTemplate(false)
      setMapSnapshot(undefined)
    }
  }, [aiState, map])

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
            position: 'fixed',
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
