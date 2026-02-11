"use client"

export const dynamic = 'force-dynamic'

import Image from "next/image"
import { AuthPage } from "@/components/auth"
import { useAuth } from "@/lib/auth/v0"

function Logo() {
  return (
    <div className="flex items-center gap-2 text-xl font-semibold">
      <Image src="/images/logo-green.png" alt="QCX Logo" width={32} height={32} />
      QCX
    </div>
  )
}

function ArtPanel() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl">
      <Image src="/images/abstract-art.png" alt="Abstract art" fill className="object-cover" priority />
    </div>
  )
}

export function AuthClientPage() {
  const {
    isLoading,
    error,
    magicLinkSent,
    magicLinkEmail,
    handleGoogleSignIn,
    handleMagicLink,
    resetError,
    resetMagicLink,
  } = useAuth({
    // Optional callbacks for additional handling
    onMagicLinkSent: (email) => {
      console.log("Magic link sent to:", email)
    },
    onError: (error) => {
      console.error("Auth error:", error)
    },
  })

  return (
    <AuthPage
      title="Welcome to QCX"
      subtitle="Let's get you started with Quality Computer Experiences"
      logo={<Logo />}
      onGoogleSignIn={handleGoogleSignIn}
      onMagicLinkSubmit={handleMagicLink}
      showGitHub={false}
      decorativePanel={<ArtPanel />}
      isLoading={isLoading}
      error={error}
      magicLinkSent={magicLinkSent}
      magicLinkEmail={magicLinkEmail}
      onResetMagicLink={resetMagicLink}
      onResetError={resetError}
    />
  )
}
