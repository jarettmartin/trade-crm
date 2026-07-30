import { api } from "./api";
import { formatInvoiceNumber } from "./format";

/** In-memory cache of downloaded PDF blobs keyed by invoice ID */
const pdfCache = new Map<string, Blob>();

/**
 * Clear the cached PDF blob for a given invoice ID.
 * Call this when the invoice data changes (e.g. status) to force a re-fetch.
 */
export function clearPdfCache(invoiceId: string): void {
  pdfCache.delete(invoiceId);
}

/**
 * Get a PDF blob for the given invoice ID.
 * Downloads from the API if not already cached.
 */
export async function getPdfBlob(invoiceId: string): Promise<Blob> {
  const cached = pdfCache.get(invoiceId);
  if (cached) {
    return cached;
  }
  const blob = await api.downloadInvoicePdf(invoiceId);
  pdfCache.set(invoiceId, blob);
  return blob;
}

/**
 * Download a PDF to the user's device.
 * Triggers a browser download with the invoice filename.
 * Example filename: "MyBusiness-invoice-88880001.pdf"
 */
export async function downloadPdf(
  invoiceId: string,
  invoiceNumber: number,
  businessName?: string,
): Promise<void> {
  const blob = await getPdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const prefix = businessName ? `${businessName.replace(/\s+/g, "")}-` : "";
  a.href = url;
  a.download = `${prefix}invoice-${formatInvoiceNumber(invoiceNumber, false)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
