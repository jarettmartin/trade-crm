import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { SearchCustomerDto } from '../dto/search-customer.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @UseGuards(TenantGuard)
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.customerService.create(dto, user.tenantId!);
  }

  @Get('search')
  @UseGuards(TenantGuard)
  async search(
    @Query() dto: SearchCustomerDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.customerService.search(dto, user.tenantId!);
  }

  @Get(':id')
  @UseGuards(TenantGuard)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.customerService.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @UseGuards(TenantGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.customerService.update(id, dto, user.tenantId!);
  }
}
