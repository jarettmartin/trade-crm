import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenants/tenant.module';
import { CustomerModule } from './customers/customer.module';
import { JobModule } from './jobs/job.module';
import { InvoiceModule } from './invoices/invoice.module';
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
    JobModule,
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
