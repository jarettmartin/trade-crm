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
