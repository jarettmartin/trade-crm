import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceEmailAttempt } from '../entities/invoice-email-attempt.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { InvoiceEmailStatus } from '../../common/enums/invoice-email-status.enum';
import { PdfService } from './pdf.service';
import { EmailService } from '../../email/services/email.service';

/** Attempts left PENDING this long are assumed dead (crash/restart). */
const STALE_PENDING_AGE_MS = 30 * 60 * 1000;

/** Handlebars template name in src/email/templates/ for invoice emails. */
const INVOICE_EMAIL_TEMPLATE = 'invoice-email';

@Injectable()
export class InvoiceEmailService implements OnModuleInit {
  private readonly logger = new Logger(InvoiceEmailService.name);
  private readonly fromEmail: string;

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceEmailAttempt)
    private readonly attemptRepository: Repository<InvoiceEmailAttempt>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.fromEmail = this.configService.get<string>('SES_FROM_EMAIL', '');
  }

  async onModuleInit() {
    // Recover attempts that were left PENDING by a crash or restart: sending
    // again could double-deliver, so fail them explicitly and leave history.
    const cutoff = new Date(Date.now() - STALE_PENDING_AGE_MS);
    const stale = await this.attemptRepository.find({
      where: {
        status: InvoiceEmailStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
    });

    if (stale.length > 0) {
      await this.attemptRepository.update(
        stale.map((a) => a.id),
        {
          status: InvoiceEmailStatus.FAILED,
          errorMessage:
            'Email send interrupted (server restarted before completion)',
        },
      );
      this.logger.warn(
        `Marked ${stale.length} stale PENDING invoice email attempt(s) as FAILED`,
      );
    }
  }
  /**
   * Validates the customer has a usable email, records a PENDING attempt,
   * and kicks off background processing (PDF generation + SES send).
   * Returns immediately so the UI can poll `getAttempts`.
   */
  async sendInvoiceEmail(
    invoiceId: string,
    tenantId: string,
  ): Promise<InvoiceEmailAttempt> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenantId },
      relations: { job: { customer: true } },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Use the customer's *current* email on file (the invoice snapshot only
    // matters for display on the PDF itself).
    const customerEmail = invoice.job?.customer?.email?.trim();
    if (!customerEmail) {
      throw new BadRequestException(
        'Customer has no email on file. Add one before sending the invoice.',
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new BadRequestException(
        'Customer email on file is not a valid email address',
      );
    }

    // Guard against duplicate sends while one is already in flight.
    const active = await this.attemptRepository.findOne({
      where: {
        invoiceId,
        tenantId,
        status: InvoiceEmailStatus.PENDING,
      },
    });
    if (active) {
      throw new ConflictException(
        'An email for this invoice is already being sent',
      );
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    const fromEmail = this.fromEmail;
    if (!fromEmail) {
      throw new Error(
        'SES_FROM_EMAIL is not configured. Invoice emails must be sent from a ' +
          'verified SES identity owned by the platform (e.g. no-reply@sprout-crm.com), ' +
          'never from the tenant’s own business email.',
      );
    }
    const formattedNumber = String(invoice.invoiceNumber)
      .padStart(8, '0')
      .replace(/(\d{4})(\d{4})/, '$1 $2');
    const businessName = tenant?.businessName || 'your business';
    const fileName = `invoice-${String(invoice.invoiceNumber).padStart(8, '0')}.pdf`;

    const customerName = `${invoice.job?.customer?.firstName ?? ''} ${
      invoice.job?.customer?.lastName ?? ''
    }`.trim();

    // Context fed to the Handlebars template (src/email/templates/invoice-email.hbs).
    const amountDue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(invoice.total));
    const paymentNoteRaw = tenant?.invoicePaymentMethodNote?.trim() ?? '';
    const emailContext = {
      customerName: customerName || 'there',
      invoiceNumber: formattedNumber,
      businessName,
      amountDue,
      // Trailing blank line separates the note from the following paragraph.
      paymentNote: paymentNoteRaw ? `${paymentNoteRaw}\n\n` : '',
      businessEmail: tenant?.businessEmail || fromEmail,
    };

    // Subject is rendered by the same template that produces the body so the
    // copy lives in one place; it is stored on the attempt for history.
    const { subject } = this.emailService.renderEmailTemplate(
      INVOICE_EMAIL_TEMPLATE,
      emailContext,
    );

    const snapshot = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceStatus: invoice.status,
      version: invoice.version,
      jobTitle: invoice.job?.title ?? '',
      customerName,
      total: Number(invoice.total),
      taxPercent: Number(invoice.taxPercent),
    };

    const attempt = await this.attemptRepository.save(
      this.attemptRepository.create({
        invoiceId,
        tenantId,
        recipientEmail: customerEmail,
        fromEmail,
        subject,
        status: InvoiceEmailStatus.PENDING,
        snapshot,
      }),
    );

    // Fire-and-forget: PDF generation + SES delivery happen in the background.
    // The attempt row drives the UI via polling.
    void this.processAttempt({
      attemptId: attempt.id,
      invoiceId,
      tenantId,
      emailContext,
      mail: {
        to: customerEmail,
        fromBusinessName: tenant?.businessName || '',
        fromEmail,
        replyTo: tenant?.businessEmail || undefined,
        fileName,
      },
    });

    return attempt;
  }
  async getAttempts(
    invoiceId: string,
    tenantId: string,
  ): Promise<InvoiceEmailAttempt[]> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.attemptRepository.find({
      where: { invoiceId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  private async processAttempt(params: {
    attemptId: string;
    invoiceId: string;
    tenantId: string;
    emailContext: Record<string, unknown>;
    mail: {
      to: string;
      fromBusinessName: string;
      fromEmail: string;
      replyTo?: string;
      fileName: string;
    };
  }): Promise<void> {
    try {
      const pdfBuffer = await this.pdfService.generateInvoicePdf(
        params.invoiceId,
        params.tenantId,
      );

      const fromHeader = params.mail.fromBusinessName
        ? `"${params.mail.fromBusinessName.replace(/"/g, "'")}" <${params.mail.fromEmail}>`
        : params.mail.fromEmail;

      const { subject, textBody } = this.emailService.renderEmailTemplate(
        INVOICE_EMAIL_TEMPLATE,
        params.emailContext,
      );

      const { messageId } = await this.emailService.sendEmail({
        to: params.mail.to,
        from: fromHeader,
        replyTo: params.mail.replyTo,
        subject,
        textBody,
        attachment: {
          filename: params.mail.fileName,
          contentType: 'application/pdf',
          content: pdfBuffer,
        },
      });

      await this.attemptRepository.update(params.attemptId, {
        status: InvoiceEmailStatus.SENT,
        messageId,
        sentAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.log(
        `Invoice email ${params.attemptId} sent via SES (${messageId})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Invoice email ${params.attemptId} failed: ${message}`,
        stack,
      );

      await this.attemptRepository.update(params.attemptId, {
        status: InvoiceEmailStatus.FAILED,
        errorMessage: message || 'Unknown error while sending the email',
        updatedAt: new Date(),
      });
    }
  }
}
