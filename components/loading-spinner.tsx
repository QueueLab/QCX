'use client'

import { useMapLoading } from '@/components/map-loading-context'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import '@/app/loading.css'

const LoadingSpinner = () => {
  const { isMapLoaded } = useMapLoading()
  const [isVisible, setIsVisible] = useState(!isMapLoaded)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (!isMapLoaded) {
      setIsVisible(true)
    } else {
      timer = setTimeout(() => setIsVisible(false), 500) // Corresponds to fadeOut duration
    }
    return () => clearTimeout(timer)
  }, [isMapLoaded])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${
        isMapLoaded ? 'fade-out' : 'fade-in'
      }`}
    >
      <Image
        src="/images/logo.svg"
        alt="Loading..."
        width={100}
        height={100}
        className="spinning"
      />
    </div>
  )
}

export default LoadingSpinner
