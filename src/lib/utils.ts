import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { sanitizeHtml } from "./security"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Secure text rendering utility
export function renderSecureText(text: string | null | undefined): string {
  if (!text) return '';
  return sanitizeHtml(text);
}

// Safe JSON parsing with error handling
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return parsed !== null && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}
