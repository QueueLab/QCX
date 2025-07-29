'use client'

import { useChatLoading } from '@/components/chat-loading-context'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import '@/app/loading.css'

const LoadingSpinner = () => {
  const { isChatLoading } = useChatLoading()
  const [isVisible, setIsVisible] = useState(isChatLoading)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isChatLoading) {
      setIsVisible(true)
    } else {
      timer = setTimeout(() => setIsVisible(false), 500) // Corresponds to fadeOut duration
    }
    return () => clearTimeout(timer)
  }, [isChatLoading])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${
        !isChatLoading ? 'fade-out' : 'fade-in'
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
