import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenants/tenant.module';
import { CustomerModule } from './customers/customer.module';
import { CatalogModule } from './catalog/catalog.module';
import { JobModule } from './jobs/job.module';
import { InvoiceModule } from './invoices/invoice.module';
import { EmailModule } from './email/email.module';
import { CommonModule } from './common/common.module';
import typeOrmConfig from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    CommonModule,
    AuthModule,
    TenantModule,
    CustomerModule,
    CatalogModule,
    JobModule,
    InvoiceModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
