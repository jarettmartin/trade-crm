import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { PdfService } from './services/pdf.service';
import { Invoice } from './entities/invoice.entity';
import { Job } from '../jobs/entities/job.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Job, Tenant])],
  controllers: [InvoiceController],
  providers: [InvoiceService, PdfService],
})
export class InvoiceModule {}
