import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { InvoiceEmailService } from '../services/invoice-email.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

@Controller()
export class InvoiceEmailController {
  constructor(private readonly invoiceEmailService: InvoiceEmailService) {}

  /**
   * Queue an email for the invoice. Returns the PENDING attempt immediately;
   * the delivery happens in the background and can be followed via
   * `GET /invoices/:invoiceId/emails`.
   */
  @Post('invoices/:invoiceId/email')
  @UseGuards(TenantGuard)
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
