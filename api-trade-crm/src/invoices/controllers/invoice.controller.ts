import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { PdfService } from '../services/pdf.service';
import type { InvoicePdfData } from '../services/pdf.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

@Controller()
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly pdfService: PdfService,
  ) {}

  @Post('jobs/:jobId/invoices')
  @UseGuards(TenantGuard)
  async create(
    @Param('jobId') jobId: string,
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.invoiceService.create(jobId, dto, user.tenantId!);
  }

  @Patch('invoices/:invoiceId')
  @UseGuards(TenantGuard)
  async updateStatus(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: { status: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.invoiceService.updateStatus(
      invoiceId,
      dto.status,
      user.tenantId!,
    );
  }

  @Get('invoices/:invoiceId/pdf')
  @UseGuards(TenantGuard)
  async downloadPdf(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: CurrentUserType,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generateInvoicePdf(
      invoiceId,
      user.tenantId!,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  /**
   * DEV-ONLY: Generate a PDF from raw invoice data (no DB lookup).
   * Used to bulk-produce demo invoice PDFs. Guarded so it cannot
   * run in production or when ENABLE_DEV_PDF_ENDPOINT is not explicitly truthy.
   */
  @Post('dev/generate-invoice-pdf')
  async generatePdfFromData(
    @Body() data: InvoicePdfData,
    @Res() res: Response,
  ) {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_DEV_PDF_ENDPOINT !== 'true'
    ) {
      throw new ForbiddenException('This endpoint is only available in dev');
    }

    const pdfBuffer = await this.pdfService.generatePdfFromData(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${data.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
