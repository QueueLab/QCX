'use client'

import React from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { ResolutionImage } from './resolution-image'
import { Button } from './ui/button'
import { useActions, useUIState } from 'ai/rsc'
import { AI } from '@/app/actions'
import { nanoid } from '@/lib/utils/nanoid'
import { UserMessage } from './user-message'
import { toast } from 'sonner'
import { CompareSlider } from './compare-slider'
import { compressImage } from '@/lib/utils/image-utils'

interface ResolutionCarouselProps {
  mapboxImage?: string | null
  googleImage?: string | null
  initialImage?: string | null
}

export function ResolutionCarousel({ mapboxImage, googleImage, initialImage }: ResolutionCarouselProps) {
  const actions = useActions<typeof AI>() as any
  const [, setMessages] = useUIState<typeof AI>()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)

  const handleQCXAnalysis = async () => {
    if (!googleImage) return
    setIsAnalyzing(true)

    try {
      const response = await fetch(googleImage)
      const rawBlob = await response.blob()
      const blob = await compressImage(rawBlob).catch(e => {
        console.error('Failed to compress image for analysis:', e);
        return rawBlob;
      });

      setMessages((currentMessages: any[]) => [
        ...currentMessages,
        {
          id: nanoid(),
          component: <UserMessage content={[{ type: 'text', text: 'Performing QCX-TERRA ANALYSIS on Google Satellite image.' }]} />
        }
      ])

      const formData = new FormData()
      formData.append('file', blob, 'google_analysis.png')
      formData.append('action', 'resolution_search')

      const responseMessage = await actions.submit(formData)
      setMessages((currentMessages: any[]) => [...currentMessages, responseMessage as any])
    } catch (error) {
      console.error('Failed to perform QCX-TERRA ANALYSIS:', error)
      toast.error('An error occurred during analysis.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const slides: Array<{ type: 'compare', left: string, right: string } | { type: 'image', src: string, showAnalysis: boolean, label: string }> = []

  // Slide 1: Comparison (if both exist)
  if (mapboxImage && googleImage) {
    slides.push({
      type: 'compare',
      left: mapboxImage,
      right: googleImage
    })
  }

  // Individual slides
  if (mapboxImage) slides.push({ type: 'image', src: mapboxImage, showAnalysis: false, label: 'MAPBOX' })
  if (googleImage) slides.push({ type: 'image', src: googleImage, showAnalysis: true, label: 'GOOGLE SATELLITE' })

  // Fallback
  if (slides.length === 0 && initialImage) {
    slides.push({ type: 'image', src: initialImage, showAnalysis: false, label: 'MAP CAPTURE' })
  }

  if (slides.length === 0) return null

  if (slides.length === 1) {
    const item = slides[0]
    if (item.type === 'image') {
      return (
        <div className="flex flex-col items-center">
          <ResolutionImage src={item.src} className="mb-0" />
          {item.showAnalysis && (
            <Button
              variant="default"
              size="sm"
              className="mt-2 w-full font-bold py-4 h-auto text-xs uppercase tracking-widest"
              onClick={handleQCXAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'ANALYZING...' : 'QCX-TERRA ANALYSIS'}
            </Button>
          )}
        </div>
      )
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto my-4 px-2">
      <Carousel className="w-full">
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="flex flex-col items-center p-1">
                {slide.type === 'compare' ? (
                  <CompareSlider leftImage={slide.left} rightImage={slide.right} className="w-full" />
                ) : (
                  <>
                    <ResolutionImage src={slide.src} className="mb-0 mt-0 w-full" />
                    {slide.showAnalysis && (
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-2 w-full font-bold py-4 h-auto text-xs uppercase tracking-widest"
                        onClick={handleQCXAnalysis}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? 'ANALYZING...' : 'QCX-TERRA ANALYSIS'}
                      </Button>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground uppercase tracking-widest">
                      {slide.label}
                    </div>
                  </>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <div className="flex justify-center gap-4 mt-2">
            <CarouselPrevious className="static translate-y-0" />
            <CarouselNext className="static translate-y-0" />
          </div>
        )}
      </Carousel>
    </div>
  )
}
