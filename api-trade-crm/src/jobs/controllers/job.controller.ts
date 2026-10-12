import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobService } from '../services/job.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { CreateJobLineItemDto } from '../dto/create-job-line-item.dto';
import { CreateJobNoteDto } from '../dto/create-job-note.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { QueryJobsDto } from '../dto/query-jobs.dto';
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
    @Query() query: QueryJobsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.findAll(
      user.tenantId!,
      query.page ?? 1,
      query.limit ?? 10,
      query.status,
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

  @Post(':id/notes')
  @UseGuards(TenantGuard)
  async createNote(
    @Param('id') id: string,
    @Body() dto: CreateJobNoteDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.createNote(id, dto, user.tenantId!);
  }

  @Post(':id/line-items')
  @UseGuards(TenantGuard)
  async createLineItem(
    @Param('id') id: string,
    @Body() dto: CreateJobLineItemDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.createLineItem(id, dto, user.tenantId!);
  }

  @Delete(':id/line-items/:lineItemId')
  @UseGuards(TenantGuard)
  async deleteLineItem(
    @Param('id') id: string,
    @Param('lineItemId') lineItemId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.jobService.deleteLineItem(id, lineItemId, user.tenantId!);
  }
}
