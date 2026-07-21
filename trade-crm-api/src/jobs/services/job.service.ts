import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { JobNote } from '../entities/job-note.entity';
import { JobLineItem } from '../entities/job-line-item.entity';
import { CreateJobDto } from '../dto/create-job.dto';
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

  async findById(id: string, tenantId: string) {
    const job = await this.jobRepository.findOne({
      where: { id, tenantId },
      relations: {
        customer: true,
        customerAddress: true,
        notes: true,
        lineItems: true,
      },
      order: {
        notes: { createdAt: 'ASC' },
        lineItems: { sortOrder: 'ASC' },
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
    const { notes, lineItems, ...jobData } = dto;

    const job = await this.jobRepository.findOne({
      where: { id, tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Update job fields
    Object.assign(job, jobData);
    await this.jobRepository.save(job);

    // Replace notes if provided
    if (notes !== undefined) {
      await this.noteRepository.delete({ jobId: id, tenantId });
      if (notes.length > 0) {
        const noteEntities = notes.map((n) =>
          this.noteRepository.create({
            ...n,
            tenantId,
            jobId: id,
          }),
        );
        await this.noteRepository.save(noteEntities);
      }
    }

    // Replace line items if provided
    if (lineItems !== undefined) {
      await this.lineItemRepository.delete({ jobId: id, tenantId });
      if (lineItems.length > 0) {
        const lineItemEntities = lineItems.map((li) =>
          this.lineItemRepository.create({
            ...li,
            tenantId,
            jobId: id,
          }),
        );
        await this.lineItemRepository.save(lineItemEntities);
      }
    }

    // Return job with notes and line items
    const updatedJob = await this.jobRepository.findOne({
      where: { id, tenantId },
      relations: { notes: true, lineItems: true },
    });

    return updatedJob;
  }
}
