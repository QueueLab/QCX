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
  src: string
  className?: string
  alt?: string
}

export function ResolutionImage({ src, className, alt = 'Map Imagery' }: ResolutionImageProps) {
  if (!src) return null

  return (
    <div className={cn('mt-2 mb-4', className)}>
      <Dialog>
        <DialogTrigger asChild>
          <motion.div
            className="w-fit cursor-pointer relative glassmorphic overflow-hidden rounded-lg border bg-muted"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-2">
                <img
                  src={src}
                  alt={alt}
                  className="max-w-xs max-h-64 rounded-md object-contain"
                />
              </CardContent>
            </Card>
          </motion.div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] p-1 glassmorphic border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <img
              src={src}
              alt={`${alt} Full`}
              className="h-auto w-full object-contain max-h-[85vh] rounded-md"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
