import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Handlebars from 'handlebars';
import { chromium } from 'playwright';
import { Invoice } from '../entities/invoice.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import * as fs from 'fs';
import * as path from 'path';

Handlebars.registerHelper('formatNumber', (value: number) => {
  return (value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
});

export interface InvoicePdfData {
  invoiceNumber: number;
  version: number;
  status: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  issuedAt?: string | Date;
  snapshot: {
    customer?: {
      name?: string;
      companyName?: string | null;
      phone?: string;
      email?: string;
    };
    serviceAddress?: {
      label?: string;
      addressLine1?: string;
      addressLine2?: string | null;
      city?: string;
      stateProvince?: string;
      zipPostalCode?: string;
    };
    lineItems?: Array<{
      type: string;
      description: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  };
  tenant?: {
    businessName?: string;
    businessEmail?: string;
    phone?: string | null;
    invoicePaymentMethodNote?: string | null;
  };
}

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private template: HandlebarsTemplateDelegate | null = null;
  private browser: any = null;

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {
    this.loadTemplate();
  }

  private loadTemplate() {
    const templatePath = path.join(__dirname, '..', 'templates', 'invoice.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    this.template = Handlebars.compile(templateSource);
  }

  private async getBrowser() {
    if (!this.browser) {
      const executablePath = process.env.CHROMIUM_PATH;
      this.browser = await chromium.launch(
        executablePath
          ? { executablePath, args: ['--no-sandbox'] }
          : { args: ['--no-sandbox'] },
      );
    }
    return this.browser;
  }

  /**
   * Generate a PDF from raw invoice/tenant data without hitting the DB.
   * Used by the dev-only preview endpoint and for bulk generation of demo PDFs.
   */
  async generatePdfFromData(data: InvoicePdfData): Promise<Buffer> {
    const tenant = data.tenant ?? {};
    const snapshot = data.snapshot ?? {};
    const now = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedInvoiceNumber = String(data.invoiceNumber)
      .padStart(8, '0')
      .replace(/(\d{4})(\d{4})/, '$1 $2');

    const html = this.template!({
      businessName: tenant.businessName ?? 'Business',
      businessEmail: tenant.businessEmail ?? '',
      businessPhone: tenant.phone ?? '',
      invoiceNumber: formattedInvoiceNumber,
      issuedAt: data.issuedAt
        ? new Date(data.issuedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : now,
      status: data.status,
      customerName: snapshot.customer?.name ?? '',
      customerCompany: snapshot.customer?.companyName,
      customerPhone: snapshot.customer?.phone ?? '',
      customerEmail: snapshot.customer?.email ?? '',
      addressLabel: snapshot.serviceAddress?.label ?? '',
      addressLine1: snapshot.serviceAddress?.addressLine1 ?? '',
      addressLine2: snapshot.serviceAddress?.addressLine2,
      city: snapshot.serviceAddress?.city ?? '',
      stateProvince: snapshot.serviceAddress?.stateProvince ?? '',
      zipPostalCode: snapshot.serviceAddress?.zipPostalCode ?? '',
      services: (snapshot.lineItems ?? [])
        .filter((item) => item.type === 'SERVICE')
        .map((item, index) => ({
          sortOrder: index + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      materials: (snapshot.lineItems ?? [])
        .filter((item) => item.type === 'MATERIAL')
        .map((item, index) => ({
          sortOrder: index + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      fees: (snapshot.lineItems ?? [])
        .filter((item) => item.type === 'FEE')
        .map((item, index) => ({
          sortOrder: index + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      subtotal: Number(data.subtotal),
      taxPercent: Number(data.taxPercent),
      taxAmount: Number(data.taxAmount),
      total: Number(data.total),
      paymentNote: tenant.invoicePaymentMethodNote,
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      printBackground: true,
    });

    await page.close();

    return Buffer.from(pdfBuffer);
  }

  async generateInvoicePdf(
    invoiceId: string,
    tenantId: string,
  ): Promise<Buffer> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    return this.generatePdfFromData({
      invoiceNumber: invoice.invoiceNumber,
      version: invoice.version,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      taxPercent: Number(invoice.taxPercent),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      issuedAt: invoice.issuedAt,
      snapshot: invoice.snapshot as any,
      tenant: {
        businessName: tenant?.businessName,
        businessEmail: tenant?.businessEmail,
        phone: tenant?.phone,
        invoicePaymentMethodNote: tenant?.invoicePaymentMethodNote,
      },
    });
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
