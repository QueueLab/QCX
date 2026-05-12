'use client'

import React, { useState } from 'react'
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

      // Removed success toast as per user request
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
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
}
