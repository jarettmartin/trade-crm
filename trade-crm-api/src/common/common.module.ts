import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantGuard } from './guards/tenant.guard';
import { User } from '../users/entities/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [TenantGuard],
  exports: [TenantGuard, TypeOrmModule],
})
export class CommonModule {}
