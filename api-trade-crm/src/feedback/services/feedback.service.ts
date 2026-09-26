import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';
import { FeedbackEmailService } from './feedback-email.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly feedbackEmailService: FeedbackEmailService,
  ) {}

  async create(
    dto: CreateFeedbackDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ) {
    // Notification bookkeeping is decided up front so the row never claims a
    // send is in flight when notifications are switched off.
    const notifyEmail = this.feedbackEmailService.getNotificationRecipient();

    const submission = this.feedbackRepository.create({
      type: dto.type,
      subject: dto.subject?.trim() || undefined,
      message: dto.message.trim(),
      tenantId,
      userId,
      userEmail: userEmail ?? '',
      emailStatus: notifyEmail
        ? FeedbackEmailStatus.PENDING
        : FeedbackEmailStatus.SKIPPED,
      emailRecipient: notifyEmail || undefined,
    });

    const saved = await this.feedbackRepository.save(submission);

    this.logger.log(
      `Feedback ${saved.id} (${saved.type}) submitted for tenant ${tenantId}`,
    );

    // Fire-and-forget: the internal notification never blocks or fails the
    // submission, and its outcome is never shown to the submitting user.
    if (notifyEmail) {
      void this.feedbackEmailService.notify(saved);
    }

    // Returned as-is: the internal notification columns are marked @Exclude()
    // on the entity and stripped by ClassSerializerInterceptor on the
    // controller, so no per-call-site mapping is needed (or can be forgotten).
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
