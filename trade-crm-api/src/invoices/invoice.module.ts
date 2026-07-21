import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { Invoice } from './entities/invoice.entity';
import { Job } from '../jobs/entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Job])],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
