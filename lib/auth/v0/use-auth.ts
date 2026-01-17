"use client"

import { useState, useCallback } from "react"
import type { AuthState, AuthCallbacks, AuthError } from "./types"
import { sendMagicLink, signInWithGoogle, signInWithGitHub } from "./auth-service"

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
}

export function useAuth(callbacks?: AuthCallbacks) {
  const [state, setState] = useState<AuthState>(initialState)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkEmail, setMagicLinkEmail] = useState<string | null>(null)

  const setLoading = (isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading, error: null }))
  }

  const setError = (error: AuthError) => {
    setState((prev) => ({ ...prev, isLoading: false, error }))
    callbacks?.onError?.(error)
  }

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true)
    const result = await signInWithGoogle()

    if (!result.success && result.error) {
      setError(result.error)
    }
    // Note: On success, user will be redirected
  }, [callbacks])

  const handleGitHubSignIn = useCallback(async () => {
    setLoading(true)
    const result = await signInWithGitHub()

    if (!result.success && result.error) {
      setError(result.error)
    }
    // Note: On success, user will be redirected
  }, [callbacks])

  const handleMagicLink = useCallback(
    async (email: string) => {
      setLoading(true)
      setMagicLinkSent(false)
      setMagicLinkEmail(null)

      const result = await sendMagicLink(email)

      if (result.success) {
        setMagicLinkSent(true)
        setMagicLinkEmail(email)
        setState((prev) => ({ ...prev, isLoading: false }))
        callbacks?.onMagicLinkSent?.(email)
      } else {
        setError({
          code: "MAGIC_LINK_ERROR",
          message: result.message,
        })
      }
    },
    [callbacks],
  )

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const resetMagicLink = useCallback(() => {
    setMagicLinkSent(false)
    setMagicLinkEmail(null)
  }, [])

  return {
    ...state,
    magicLinkSent,
    magicLinkEmail,
    handleGoogleSignIn,
    handleGitHubSignIn,
    handleMagicLink,
    resetError,
    resetMagicLink,
  }
}
