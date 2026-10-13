import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InvoiceEmailService } from '../services/invoice-email.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { EmailThrottlerGuard } from '../../email/guards/email-throttler.guard';
import {
  EMAIL_RATE_LIMITS,
  EMAIL_RATE_WINDOW_MS,
} from '../../email/email-throttle.config';

@Controller()
export class InvoiceEmailController {
  constructor(private readonly invoiceEmailService: InvoiceEmailService) {}

  /**
   * Queue an email for the invoice. Returns the PENDING attempt immediately;
   * the delivery happens in the background and can be followed via
   * `GET /invoices/:invoiceId/emails`.
   *
   * Rate limited per tenant, per day (`EMAIL_RATE_LIMITS.invoicePerTenantPerDay`).
   */
  @Post('invoices/:invoiceId/email')
  @UseGuards(TenantGuard, EmailThrottlerGuard)
  @Throttle({
    default: {
      limit: EMAIL_RATE_LIMITS.invoicePerTenantPerDay,
      ttl: EMAIL_RATE_WINDOW_MS,
    },
  })
  async sendEmail(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.invoiceEmailService.sendInvoiceEmail(invoiceId, user.tenantId!);
  }

  /** Full history of email attempts for an invoice (newest first). */
  @Get('invoices/:invoiceId/emails')
  @UseGuards(TenantGuard)
  async getEmails(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.invoiceEmailService.getAttempts(invoiceId, user.tenantId!);
  }
}
