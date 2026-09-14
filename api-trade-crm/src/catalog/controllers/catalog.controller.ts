import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from '../services/catalog.service';
import { CreateCatalogItemDto } from '../dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from '../dto/update-catalog-item.dto';
import { QueryCatalogItemsDto } from '../dto/query-catalog-items.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

@Controller('catalog-items')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  @UseGuards(TenantGuard)
  async create(
    @Body() dto: CreateCatalogItemDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.catalogService.create(dto, user.tenantId!);
  }

  @Get()
  @UseGuards(TenantGuard)
  async findAll(
    @Query() query: QueryCatalogItemsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.catalogService.findAll(
      user.tenantId!,
      query.page ?? 1,
      query.limit ?? 10,
      query.type,
    );
  }

  @Get(':id')
  @UseGuards(TenantGuard)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.catalogService.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @UseGuards(TenantGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.catalogService.update(id, dto, user.tenantId!);
  }

  @Delete(':id')
  @UseGuards(TenantGuard)
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.catalogService.delete(id, user.tenantId!);
  }
}
