"use client"

// Inspired by react-hot-toast library
import { useState, useEffect, useCallback, type ReactNode } from "react"

export type ToastProps = {
  id: string
  title?: string
  description?: ReactNode
  action?: ReactNode
  variant?: "default" | "destructive"
}

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: string
  description?: ReactNode
  action?: ReactNode
  variant?: "default" | "destructive"
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const toasts: ToasterToast[] = []

type Toast = Omit<ToasterToast, "id">

function useToast() {
  const [, setToasts] = useState<ToasterToast[]>(toasts)

  useEffect(() => {
    const listener = () => {
      setToasts([...toasts])
    }

    window.addEventListener("toast", listener)

    return () => window.removeEventListener("toast", listener)
  }, [])

  const toast = useCallback(({ ...props }: Toast) => {
    const id = genId()

    const newToast = {
      ...props,
      id,
    }

    toasts.push(newToast)
    setToasts([...toasts])

    setTimeout(() => {
      toasts.splice(
        toasts.findIndex((t) => t.id === id),
        1,
      )
      setToasts([...toasts])
    }, TOAST_REMOVE_DELAY)

    return id
  }, [])

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      const index = toasts.findIndex((t) => t.id === toastId)
      if (index !== -1) {
        toasts.splice(index, 1)
        setToasts([...toasts])
      }
    } else {
      toasts.splice(0, toasts.length)
      setToasts([])
    }
  }, [])

  return {
    toast,
    dismiss,
    toasts,
  }
}

export { useToast, type ToasterToast }
