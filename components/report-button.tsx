'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { useAIState } from 'ai/rsc'
import { useMapData } from '@/components/map/map-data-context'
import { useMap } from '@/components/map/map-context'
import { generateReport } from '@/lib/utils/report-generator'
import { toast } from 'sonner'

interface ReportButtonProps {
  inline?: boolean
}

export const ReportButton = ({ inline = false }: ReportButtonProps) => {
  const [aiState] = useAIState()
  const { mapData } = useMapData()
  const { map } = useMap()
  const [isGenerating, setIsGenerating] = useState(false)
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!inline) {
      setPortalNode(document.getElementById('header-report-portal'))
    }
  }, [inline])

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

  const button = (
    <Button
      variant={inline ? "default" : "ghost"}
      size={inline ? "default" : "icon"}
      onClick={handleDownloadReport}
      title="Download PDF Report"
      disabled={isGenerating}
      className={inline ? "w-full" : ""}
    >
      {isGenerating ? (
        <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
      ) : (
        <FileDown className="h-[1.2rem] w-[1.2rem]" />
      )}
      {inline && <span className="ml-2">Generate Report</span>}
    </Button>
  )

  if (inline) return button

  if (!portalNode) return null

  return createPortal(button, portalNode)
}
