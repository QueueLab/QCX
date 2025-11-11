/* eslint-disable @next/next/no-img-element */
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import 'glassmorphic/glassmorphic.css'

interface SearchResultsImageSectionProps {
  images: string[]
  query?: string
}

export const SearchResultsImageSection: React.FC<
  SearchResultsImageSectionProps
> = ({ images, query }) => {
  if (!images || images.length === 0) {
    return <div className="text-muted-foreground">No images found</div>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {images.map((image: any, index: number) => (
        <motion.div
          key={index}
          className="aspect-video cursor-pointer relative glassmorphic"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Card className="flex-1 h-full">
            <CardContent className="p-2 h-full w-full">
              {image ? (
                <img
                  src={image}
                  alt={`Image ${index + 1}`}
                  className="h-full w-full object-cover"
                  onError={e =>
                    (e.currentTarget.src = '/images/placeholder-image.png')
                  }
                />
              ) : (
                <div className="w-full h-full bg-muted animate-pulse" />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
