import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenants/tenant.module';
import { CustomerModule } from './customers/customer.module';
import { JobModule } from './jobs/job.module';
import { TenantGuard } from './common/guards/tenant.guard';
import { User } from './users/entities/user.entity';
import typeOrmConfig from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    TenantModule,
    CustomerModule,
    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService, TenantGuard],
  exports: [TenantGuard],
})
export class AppModule {}
