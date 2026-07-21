import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

@Controller('jobs/:jobId/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @UseGuards(TenantGuard)
  async create(
    @Param('jobId') jobId: string,
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.invoiceService.create(jobId, dto, user.tenantId!);
  }
}
