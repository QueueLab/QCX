'use client'

import { useEffect, Suspense } from 'react'
import { useSignIn, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

function DiscordAuthRedirect() {
  const { signIn } = useSignIn()
  const { isSignedIn, isLoaded: isUserLoaded } = useUser()
  const isSignInLoaded = !!signIn
  const router = useRouter()

  useEffect(() => {
    if (isUserLoaded && isSignedIn) {
      router.push('/')
      return
    }

    if (isSignInLoaded && signIn) {
      signIn.sso({
        strategy: 'oauth_discord',
        redirectCallbackUrl: '/sso-callback',
        redirectUrl: '/',
      }).catch((err) => {
        console.error('Failed to redirect to Discord SSO:', err)
      })
    }
  }, [isSignInLoaded, signIn, isUserLoaded, isSignedIn, router])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium">Redirecting to Discord SSO...</p>
      </div>
    </div>
  )
}

export default function DiscordSignInPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <DiscordAuthRedirect />
    </Suspense>
  )
}
