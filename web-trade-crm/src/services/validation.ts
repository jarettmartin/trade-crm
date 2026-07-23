/**
 * Simple client-side validation helpers.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Accepts: +1 555-123-4567, (555) 123-4567, 5551234567, etc.
  return /^\+?[\d\s\-().]{7,20}$/.test(phone);
}
