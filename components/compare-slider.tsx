'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CompareSliderProps {
  leftImage: string
  rightImage: string
  className?: string
}

export function CompareSlider({ leftImage, rightImage, className }: CompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const x = 'touches' in event ? event.touches[0].clientX : (event as React.MouseEvent).clientX
    const relativeX = x - containerRect.left
    const position = Math.max(0, Math.min(100, (relativeX / containerRect.width) * 100))

    setSliderPosition(position)
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full aspect-square sm:aspect-video overflow-hidden cursor-ew-resize rounded-lg border bg-muted", className)}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      {/* Right Image (Google Satellite) */}
      <img
        src={rightImage}
        alt="Google Satellite"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      />

      {/* Left Image (Mapbox) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <div style={{ width: containerWidth }} className="h-full relative">
          <img
            src={leftImage}
            alt="Mapbox"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute inset-y-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border-2 border-primary flex items-center justify-center shadow-xl">
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-primary/40 rounded-full" />
            <div className="w-1 h-4 bg-primary/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-[10px] rounded pointer-events-none">
        MAPBOX
      </div>
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-[10px] rounded pointer-events-none">
        GOOGLE SATELLITE
      </div>
    </div>
  )
}
