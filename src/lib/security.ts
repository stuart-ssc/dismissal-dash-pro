/**
 * Security utilities for input sanitization and validation
 */

// HTML sanitization for user inputs
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Sanitize text for display while preserving newlines
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  
  return sanitizeHtml(input).replace(/\n/g, '<br>');
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validate phone number format (basic)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Rate limiting utility for forms
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(key: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const existing = requestCounts.get(key);
  
  if (!existing || now > existing.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (existing.count >= maxRequests) {
    return true;
  }
  
  existing.count++;
  return false;
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes

// Secure storage keys
export const STORAGE_KEYS = {
  THEME: 'dismissal-pro-theme',
  USER_PREFERENCES: 'dismissal-pro-prefs',
} as const;

// Validate storage key to prevent prototype pollution
export function isValidStorageKey(key: string): boolean {
  return Object.values(STORAGE_KEYS).includes(key as any);
}