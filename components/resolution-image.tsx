/* eslint-disable @next/next/no-img-element */
'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ResolutionImageProps {
  src?: string
  mapboxSrc?: string
  googleSrc?: string
  className?: string
  alt?: string
}

export function ResolutionImage({
  src,
  mapboxSrc,
  googleSrc,
  className,
  alt = 'Map Imagery'
}: ResolutionImageProps) {
  const mSrc = mapboxSrc || (src && !googleSrc ? src : undefined)
  const gSrc = googleSrc || (src && !mapboxSrc ? src : undefined)

  if (!mSrc && !gSrc) return null

  const hasBoth = mSrc && gSrc

  return (
    <div className={cn('mt-2 mb-4', className)}>
      <Dialog>
        <DialogTrigger asChild>
          <motion.div
            className={cn(
              "cursor-pointer relative glassmorphic overflow-hidden rounded-lg border bg-muted",
              hasBoth ? "w-full max-w-2xl" : "w-fit"
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className={cn("p-2 grid gap-2", hasBoth ? "grid-cols-2" : "grid-cols-1")}>
                {mSrc && (
                  <div className="space-y-1">
                    <img
                      src={mSrc}
                      alt={`${alt} Mapbox`}
                      className="w-full h-40 md:h-64 rounded-md object-cover"
                    />
                    <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-semibold">Mapbox</p>
                  </div>
                )}
                {gSrc && (
                  <div className="space-y-1">
                    <img
                      src={gSrc}
                      alt={`${alt} Google`}
                      className="w-full h-40 md:h-64 rounded-md object-cover"
                    />
                    <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-semibold">Google Satellite</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-7xl max-h-[95vh] p-4 glassmorphic border-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium text-muted-foreground">{alt} Comparison</DialogTitle>
          </DialogHeader>
          <div className={cn("grid gap-4 h-full overflow-hidden", hasBoth ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
            {mSrc && (
              <div className="flex flex-col items-center justify-center space-y-2">
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Mapbox Preview</p>
                <img
                  src={mSrc}
                  alt={`${alt} Mapbox Full`}
                  className="h-auto w-full object-contain max-h-[70vh] rounded-lg border shadow-xl"
                />
              </div>
            )}
            {gSrc && (
              <div className="flex flex-col items-center justify-center space-y-2">
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Google Satellite Full</p>
                <img
                  src={gSrc}
                  alt={`${alt} Google Full`}
                  className="h-auto w-full object-contain max-h-[70vh] rounded-lg border shadow-xl"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
