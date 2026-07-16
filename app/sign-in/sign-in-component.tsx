'use client'

import { useSignIn, useUser } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FcGoogle } from 'react-icons/fc'
import Image from 'next/image'

export default function SignInComponent() {
  const { signIn, isLoaded: isSignInLoaded } = useSignIn()
  const { isSignedIn, isLoaded: isUserLoaded } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get redirect url from search params, default to '/'
  const redirectUrl = searchParams?.get('redirect_url') || '/'

  useEffect(() => {
    if (isUserLoaded && isSignedIn) {
      router.push(redirectUrl)
    }
  }, [isUserLoaded, isSignedIn, router, redirectUrl])

  if (!isSignInLoaded || !isUserLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: redirectUrl,
      })
    } catch (err: any) {
      console.error('Google Sign-In Error:', err)
      setError(err?.message || 'An error occurred during Google sign-in.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur shadow-2xl">
        <CardHeader className="flex flex-col items-center space-y-2 text-center pb-8">
          <div className="flex items-center gap-2 mb-2">
            <Image
              src="/images/logo.svg"
              alt="QCX Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="text-3xl font-poppins font-bold text-primary select-none">QCX</span>
          </div>
          <CardTitle className="text-2xl font-poppins font-bold text-foreground">Welcome to QCX</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sign in to access your dashboard, map tools, and history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          <Button
            variant="outline"
            type="button"
            className="w-full flex items-center justify-center gap-3 py-6 text-base font-semibold hover:bg-muted/80 border-border"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <FcGoogle className="h-5 w-5" />
            )}
            <span>Continue with Google</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
