import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/firebase-auth.guard';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantService.create(dto, user.uid);
  }
}
