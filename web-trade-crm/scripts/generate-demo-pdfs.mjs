#!/usr/bin/env node
/**
 * Generate pre-built PDFs for all seeded demo invoices.
 *
 * Reads the demo seed data (jobs.json, customers.json, tenant.json),
 * constructs an InvoicePdfData payload for every invoice, POSTs it to
 * the local dev endpoint /dev/generate-invoice-pdf, and saves the
 * resulting PDF to public/demo/invoice-pdfs/{tenantId}-{invoiceNumber}-invoice.pdf.
 *
 * Usage:
 *   Ensure the API is running locally with ENABLE_DEV_PDF_ENDPOINT=true
 *   then run:  node scripts/generate-demo-pdfs.mjs
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.VITE_API_BASE || "http://localhost:3000";

const demoDir = path.join(__dirname, "..", "src", "demo", "api");
const outDir = path.join(__dirname, "..", "public", "demo", "invoice-pdfs");

const tenant = JSON.parse(
  fs.readFileSync(path.join(demoDir, "tenant.json"), "utf-8"),
);
const customers = JSON.parse(
  fs.readFileSync(path.join(demoDir, "customers.json"), "utf-8"),
);
const jobs = JSON.parse(
  fs.readFileSync(path.join(demoDir, "jobs.json"), "utf-8"),
);

function findCustomer(customerId) {
  return customers.find((c) => c.id === customerId);
}

function findAddress(customer, addressId) {
  return (customer?.addresses || []).find((a) => a.id === addressId);
}

async function generatePdfForInvoice(job, invoice, customer, address) {
  const payload = {
    invoiceNumber: invoice.invoiceNumber,
    version: invoice.version,
    status: invoice.status,
    subtotal: invoice.subtotal,
    taxPercent: invoice.taxPercent,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    issuedAt: invoice.issuedAt || invoice.createdAt,
    snapshot: {
      customer: {
        name: `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim(),
        companyName: customer?.companyName || null,
        phone: customer?.phone || "",
        email: customer?.email || "",
      },
      serviceAddress: address
        ? {
            label: address.label || "",
            addressLine1: address.addressLine1 || "",
            addressLine2: address.addressLine2 || null,
            city: address.city || "",
            stateProvince: address.stateProvince || "",
            zipPostalCode: address.zipPostalCode || "",
          }
        : null,
      lineItems: (job.lineItems || []).map((li) => ({
        type: li.type,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
        sortOrder: li.sortOrder,
      })),
    },
    tenant: {
      businessName: tenant.businessName,
      businessEmail: tenant.businessEmail,
      phone: tenant.phone || null,
      invoicePaymentMethodNote: tenant.invoicePaymentMethodNote || null,
    },
  };

  console.log(
    `  Generating PDF for invoice ${invoice.invoiceNumber} (${invoice.id})...`,
  );
  const res = await fetch(`${API_BASE}/dev/generate-invoice-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to generate PDF for invoice ${invoice.id}: ${res.status} ${text}`,
    );
  }

  const pdfBuffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(
    outDir,
    `${tenant.id}-${invoice.invoiceNumber}-invoice.pdf`,
  );
  fs.writeFileSync(outPath, pdfBuffer);
  console.log(
    `    Saved ${path.relative(process.cwd(), outPath)} (${pdfBuffer.length} bytes)`,
  );
}

async function main() {
  console.log(`Generating demo invoice PDFs to ${outDir}`);
  console.log(`Using API base: ${API_BASE}`);
  console.log("");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let count = 0;
  for (const job of jobs) {
    const customer = findCustomer(job.customerId);
    const address = findAddress(customer, job.customerAddressId);

    for (const invoice of job.invoices || []) {
      await generatePdfForInvoice(job, invoice, customer, address);
      count++;
    }
  }

  console.log("");
  console.log(`Done. Generated ${count} invoice PDF(s).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
