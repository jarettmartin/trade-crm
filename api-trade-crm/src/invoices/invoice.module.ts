import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceEmailController } from './controllers/invoice-email.controller';
import { InvoiceService } from './services/invoice.service';
import { PdfService } from './services/pdf.service';
import { InvoiceEmailService } from './services/invoice-email.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceEmailAttempt } from './entities/invoice-email-attempt.entity';
import { Job } from '../jobs/entities/job.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceEmailAttempt, Job, Tenant]),
    EmailModule,
  ],
  controllers: [InvoiceController, InvoiceEmailController],
  providers: [InvoiceService, PdfService, InvoiceEmailService],
})
export class InvoiceModule {}
