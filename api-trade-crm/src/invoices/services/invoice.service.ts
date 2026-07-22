import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Job } from '../../jobs/entities/job.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async create(jobId: string, dto: CreateInvoiceDto, tenantId: string) {
    // 1. Fetch the job with its relations for the snapshot
    const job = await this.jobRepository.findOne({
      where: { id: jobId, tenantId },
      relations: {
        customer: true,
        customerAddress: true,
        lineItems: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // 2. Supersede any existing DRAFT invoices for this job
    await this.invoiceRepository.update(
      { jobId, status: InvoiceStatus.DRAFT },
      { status: InvoiceStatus.SUPERSEDED },
    );

    // 3. Generate the next invoice number for this tenant (starts at 88880001)
    const latestTenantInvoice = await this.invoiceRepository.findOne({
      where: { tenantId },
      order: { invoiceNumber: 'DESC' },
    });
    const invoiceNumber = latestTenantInvoice
      ? latestTenantInvoice.invoiceNumber + 1
      : 88880001;

    // 4. Determine version based on existing invoices for this job
    const existingJobInvoices = await this.invoiceRepository.count({
      where: { jobId, tenantId },
    });
    const version = existingJobInvoices + 1;

    // 5. Build the snapshot
    const snapshot = {
      customer: {
        id: job.customer?.id,
        name: `${job.customer?.firstName ?? ''} ${job.customer?.lastName ?? ''}`.trim(),
        companyName: job.customer?.companyName,
        phone: job.customer?.phone,
        email: job.customer?.email,
      },
      serviceAddress: job.customerAddress
        ? {
            id: job.customerAddress.id,
            label: job.customerAddress.label,
            addressLine1: job.customerAddress.addressLine1,
            addressLine2: job.customerAddress.addressLine2,
            city: job.customerAddress.city,
            stateProvince: job.customerAddress.stateProvince,
            zipPostalCode: job.customerAddress.zipPostalCode,
            countryCode: job.customerAddress.countryCode,
          }
        : null,
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
      },
      lineItems: (job.lineItems ?? []).map((item) => ({
        type: item.type,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        sortOrder: item.sortOrder,
      })),
      totals: {
        subtotal: dto.subtotal,
        taxPercent: dto.taxPercent,
        taxAmount: dto.taxAmount,
        total: dto.total,
      },
    };

    // 6. Create the invoice
    const invoice = this.invoiceRepository.create({
      jobId,
      tenantId,
      invoiceNumber,
      version,
      status: InvoiceStatus.DRAFT,
      subtotal: dto.subtotal,
      taxPercent: dto.taxPercent,
      taxAmount: dto.taxAmount,
      total: dto.total,
      snapshot,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    this.logger.log(
      `Invoice ${savedInvoice.invoiceNumber} created for job ${jobId}`,
    );

    return savedInvoice;
  }
}
