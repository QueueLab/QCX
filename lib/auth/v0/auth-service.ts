// Auth service - Replace these implementations with your actual auth provider
// Compatible with: NextAuth.js, Supabase Auth, Firebase Auth, Custom JWT, etc.

import { getSupabaseBrowserClient } from "../../supabase/browser-client"
import type { User, MagicLinkResponse, OAuthResponse, AuthProvider } from "./types"

// Initialize Supabase lazily to avoid build-time errors when env vars are missing
let supabaseInstance: ReturnType<typeof getSupabaseBrowserClient> | null = null

function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = getSupabaseBrowserClient()
  }
  return supabaseInstance
}

// Configuration - set these based on your auth provider
export const AUTH_CONFIG = {
  callbackUrl: "/dashboard",
  errorUrl: "/auth/error",
}

/**
 * Send magic link to email
 */
export async function sendMagicLink(email: string): Promise<MagicLinkResponse> {
  try {
    const supabase = getSupabase()
    if (!supabase) return { success: false, message: "Auth not configured" }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return {
        success: false,
        message: error.message || "Failed to send magic link",
      }
    }

    return {
      success: true,
      message: "Check your email for the magic link!",
    }
  } catch (error) {
    return {
      success: false,
      message: "Network error. Please try again.",
    }
  }
}

/**
 * Initiate Google OAuth flow
 */
export async function signInWithGoogle(): Promise<OAuthResponse> {
  try {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: { code: "CONFIG_ERROR", message: "Auth not configured" } }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      return {
        success: false,
        error: {
          code: "OAUTH_ERROR",
          message: error.message,
        },
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "OAUTH_ERROR",
        message: "Failed to initiate Google sign in",
      },
    }
  }
}

/**
 * Initiate GitHub OAuth flow
 */
export async function signInWithGitHub(): Promise<OAuthResponse> {
  try {
    const supabase = getSupabase()
    if (!supabase) return { success: false, error: { code: "CONFIG_ERROR", message: "Auth not configured" } }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return {
        success: false,
        error: {
          code: "OAUTH_ERROR",
          message: error.message,
        },
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "OAUTH_ERROR",
        message: "Failed to initiate GitHub sign in",
      },
    }
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = getSupabase()
    if (!supabase) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      avatar: user.user_metadata?.avatar_url || "",
      provider: (user.app_metadata?.provider as AuthProvider) || "email",
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at || user.created_at),
    }
  } catch {
    return null
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = getSupabase()
    if (supabase) {
      await supabase.auth.signOut()
    }
    window.location.href = "/"
  } catch (error) {
    console.error("Sign out failed:", error)
  }
}
