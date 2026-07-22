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
      this.browser = await chromium.launch();
    }
    return this.browser;
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

    const snapshot = invoice.snapshot as any;
    const now = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedInvoiceNumber = String(invoice.invoiceNumber)
      .padStart(8, '0')
      .replace(/(\d{4})(\d{4})/, '$1 $2');

    const html = this.template!({
      businessName: tenant?.businessName ?? 'Business',
      businessEmail: tenant?.businessEmail ?? '',
      businessPhone: tenant?.phone ?? '',
      invoiceNumber: formattedInvoiceNumber,
      issuedAt: invoice.issuedAt
        ? new Date(invoice.issuedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : now,
      status: invoice.status,
      customerName: snapshot?.customer?.name ?? '',
      customerCompany: snapshot?.customer?.companyName,
      customerPhone: snapshot?.customer?.phone ?? '',
      customerEmail: snapshot?.customer?.email ?? '',
      addressLabel: snapshot?.serviceAddress?.label ?? '',
      addressLine1: snapshot?.serviceAddress?.addressLine1 ?? '',
      addressLine2: snapshot?.serviceAddress?.addressLine2,
      city: snapshot?.serviceAddress?.city ?? '',
      stateProvince: snapshot?.serviceAddress?.stateProvince ?? '',
      zipPostalCode: snapshot?.serviceAddress?.zipPostalCode ?? '',
      lineItems: (snapshot?.lineItems ?? []).map(
        (item: any, index: number) => ({
          sortOrder: item.sortOrder ?? index + 1,
          description: item.description,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        }),
      ),
      subtotal: Number(invoice.subtotal),
      taxPercent: Number(invoice.taxPercent),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      paymentNote: tenant?.invoicePaymentMethodNote,
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

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
