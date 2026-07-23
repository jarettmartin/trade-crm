/**
 * Client-side validation helpers.
 */

const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;
const CA_POSTAL_REGEX = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Accepts: +1 555-123-4567, (555) 123-4567, 5551234567, etc.
  return /^\+?[\d\s\-().]{7,20}$/.test(phone);
}

/**
 * Detect country code from a zip/postal code string.
 * Returns "US", "CA", or null if neither format matches.
 */
export function detectCountryFromPostalCode(zip: string): string | null {
  if (US_ZIP_REGEX.test(zip.trim())) return "US";
  if (CA_POSTAL_REGEX.test(zip.trim())) return "CA";
  return null;
}

/**
 * Validate that a zip/postal code matches its detected country.
 * Returns an error message, or null if valid.
 */
export function validatePostalCode(zip: string): string | null {
  const trimmed = zip.trim();
  if (!trimmed) return null; // empty is handled elsewhere
  if (US_ZIP_REGEX.test(trimmed)) return null;
  if (CA_POSTAL_REGEX.test(trimmed)) return null;
  return "Enter a valid US ZIP (e.g. 12345) or Canadian postal code (e.g. A1A 1A1)";
}
