/**
 * Format an invoice number to an 8-digit string with optional space.
 * Examples:
 *   formatInvoiceNumber(88880001)        → "8888 0001"
 *   formatInvoiceNumber(5)               → "0000 0005"
 *   formatInvoiceNumber(88880001, false) → "88880001"
 */
export function formatInvoiceNumber(n: number, withSpace = true): string {
  const padded = n.toString().padStart(8, "0");
  if (withSpace) {
    return padded.replace(/(\d{4})(\d{4})/, "$1 $2");
  }
  return padded;
}

/**
 * Strip all non-digit characters from a phone string.
 */
export function stripPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Format a 10-digit phone string to (XXX) XXX-XXXX.
 * If fewer than 10 digits, returns as-is (for partial input).
 */
export function formatPhone(raw: string): string {
  const digits = stripPhone(raw);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Handle phone input change: strips non-digits, limits to 10, returns formatted display value.
 * The raw 10-digit value can be accessed via stripPhone(formatted).
 */
export function handlePhoneInput(value: string): string {
  const digits = stripPhone(value).slice(0, 10);
  return formatPhone(digits);
}
