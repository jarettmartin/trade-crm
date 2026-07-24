import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TenantGuard } from './guards/tenant.guard';
import { CognitoAuthGuard } from './guards/cognito-auth.guard';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule, AuthModule],
  providers: [TenantGuard, CognitoAuthGuard],
  exports: [TenantGuard, CognitoAuthGuard, TypeOrmModule, AuthModule],
})
export class CommonModule {}
