import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return uuidv4();
}

/**
 * Re-export generateUUID as nanoid for shorter naming and compatibility with existing code.
 * Returns a UUID v4 string.
 */
export { generateUUID as nanoid };
export { getModel } from './server'

/**
 * Normalizes and sanitizes message content to plain text.
 */
export function normalizeMessageContent(content: any): string {
  const rawContent =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map(p => (p && typeof p === "object" && "type" in p && p.type === "text") ? p.text : "").join("\n")
        : JSON.stringify(content)

  return rawContent
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, "[image omitted]")
    .trim()
}
