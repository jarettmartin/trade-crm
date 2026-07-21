import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobService } from '../services/job.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @UseGuards(TenantGuard)
  async create(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.create(dto, user.tenantId!);
  }

  @Get()
  @UseGuards(TenantGuard)
  async findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.findAll(
      user.tenantId!,
      pagination.page ?? 1,
      pagination.limit ?? 10,
    );
  }

  @Get(':id')
  @UseGuards(TenantGuard)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @UseGuards(TenantGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.update(id, dto, user.tenantId!);
  }
}
