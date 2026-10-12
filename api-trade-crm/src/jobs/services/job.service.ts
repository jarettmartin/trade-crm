import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { JobStatus } from '../../common/enums/job-status.enum';
import { JobNote } from '../entities/job-note.entity';
import { JobLineItem } from '../entities/job-line-item.entity';
import { CreateJobDto } from '../dto/create-job.dto';
import { CreateJobLineItemDto } from '../dto/create-job-line-item.dto';
import { CreateJobNoteDto } from '../dto/create-job-note.dto';
import { UpdateJobDto } from '../dto/update-job.dto';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(JobNote)
    private readonly noteRepository: Repository<JobNote>,
    @InjectRepository(JobLineItem)
    private readonly lineItemRepository: Repository<JobLineItem>,
  ) {}

  async findAll(
    tenantId: string,
    page: number,
    limit: number,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Job> = { tenantId };
    if (status) {
      where.status = status as JobStatus;
    }

    const [jobs, total] = await this.jobRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: {
        customer: true,
        customerAddress: true,
        assignedUser: true,
      },
    });

    return {
      data: jobs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const job = await this.jobRepository.findOne({
      where: { id, tenantId },
      relations: {
        customer: true,
        customerAddress: true,
        notes: { user: true },
        lineItems: true,
        invoices: { emailAttempts: true },
      },
      // Notes and line items are shown in the order they were added. The order
      // is derived from the row timestamps, so no client value decides it and
      // `id` keeps it total when two rows share a timestamp.
      order: {
        notes: { createdAt: 'ASC', id: 'ASC' },
        lineItems: { createdAt: 'ASC', id: 'ASC' },
        invoices: { createdAt: 'DESC' },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async create(dto: CreateJobDto, tenantId: string) {
    const job = this.jobRepository.create({
      ...dto,
      tenantId,
    });

    const savedJob = await this.jobRepository.save(job);

    this.logger.log(`Job ${savedJob.id} created for tenant ${tenantId}`);

    return savedJob;
  }

  async update(id: string, dto: UpdateJobDto, tenantId: string) {
    const job = await this.jobRepository.findOne({
      where: { id, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Update job fields
    Object.assign(job, dto);
    await this.jobRepository.save(job);

    // Return the same shape as GET /jobs/:id
    return this.findById(id, tenantId);
  }

  /**
   * Notes are cumulative and non-editable, so a caller adds one note at a time
   * rather than replacing the whole collection on an update.
   */
  async createNote(jobId: string, dto: CreateJobNoteDto, tenantId: string) {
    const job = await this.jobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const note = await this.noteRepository.save(
      this.noteRepository.create({ ...dto, jobId, tenantId }),
    );

    // Reload so the response matches the shape returned by GET /jobs/:id.
    const created = await this.noteRepository.findOne({
      where: { id: note.id, tenantId },
      relations: { user: true },
    });

    return created ?? note;
  }

  /**
   * Line items are added and removed one at a time, like notes, so an update
   * never rewrites rows that are already attached to the job.
   */
  async createLineItem(
    jobId: string,
    dto: CreateJobLineItemDto,
    tenantId: string,
  ) {
    const job = await this.jobRepository.findOne({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.lineItemRepository.save(
      this.lineItemRepository.create({ ...dto, jobId, tenantId }),
    );
  }

  async deleteLineItem(jobId: string, lineItemId: string, tenantId: string) {
    const result = await this.lineItemRepository.delete({
      id: lineItemId,
      jobId,
      tenantId,
    });

    if (!result.affected) {
      throw new NotFoundException('Line item not found');
    }

    return { success: true };
  }
}
