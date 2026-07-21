import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { CreateJobDto } from '../dto/create-job.dto';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async create(dto: CreateJobDto, tenantId: string) {
    const job = this.jobRepository.create({
      ...dto,
      tenantId,
    });

    const savedJob = await this.jobRepository.save(job);

    this.logger.log(`Job ${savedJob.id} created for tenant ${tenantId}`);

    return savedJob;
  }
}
