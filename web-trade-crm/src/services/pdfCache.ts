import { api } from "./api";

/** In-memory cache of downloaded PDF blobs keyed by invoice ID */
const pdfCache = new Map<string, Blob>();

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
 */
export async function downloadPdf(
  invoiceId: string,
  invoiceNumber: number,
): Promise<void> {
  const blob = await getPdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
