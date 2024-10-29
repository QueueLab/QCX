'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'
import { useTheme } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { theme } = useTheme()

  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}
