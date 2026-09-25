import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  async create(
    dto: CreateFeedbackDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ) {
    const submission = this.feedbackRepository.create({
      type: dto.type,
      subject: dto.subject?.trim() || undefined,
      message: dto.message.trim(),
      tenantId,
      userId,
      userEmail: userEmail ?? '',
    });

    const saved = await this.feedbackRepository.save(submission);

    this.logger.log(
      `Feedback ${saved.id} (${saved.type}) submitted for tenant ${tenantId}`,
    );

    return saved;
  }

  async findAll(tenantId: string, page: number, limit: number) {
    const [data, total] = await this.feedbackRepository.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
