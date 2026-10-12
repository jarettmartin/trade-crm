import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactSubmission } from '../entities/contact-submission.entity';
import { CreateContactSubmissionDto } from '../dto/create-contact-submission.dto';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';
import { ContactEmailService } from './contact-email.service';

/**
 * Records submissions from the public (unauthenticated) contact form.
 *
 * Mirrors `FeedbackService.create` minus the tenant/author stamping — there is
 * no caller identity to trust or store, only what the visitor typed.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(ContactSubmission)
    private readonly contactRepository: Repository<ContactSubmission>,
    private readonly contactEmailService: ContactEmailService,
  ) {}

  async create(dto: CreateContactSubmissionDto) {
    // Notification bookkeeping is decided up front so the row never claims a
    // send is in flight when notifications are switched off.
    const notifyEmail = this.contactEmailService.getNotificationRecipient();

    const submission = this.contactRepository.create({
      type: dto.type,
      email: dto.email.trim(),
      subject: dto.subject?.trim() || undefined,
      message: dto.message.trim(),
      emailStatus: notifyEmail
        ? FeedbackEmailStatus.PENDING
        : FeedbackEmailStatus.SKIPPED,
      emailRecipient: notifyEmail || undefined,
    });

    const saved = await this.contactRepository.save(submission);

    this.logger.log(`Contact submission ${saved.id} (${saved.type}) received`);

    // Fire-and-forget: the internal notification never blocks or fails the
    // submission, and its outcome is never shown to the visitor.
    if (notifyEmail) {
      void this.contactEmailService.notify(saved);
    }

    // Returned as-is: the internal notification columns are @Exclude()d on the
    // entity and stripped by ClassSerializerInterceptor on the controller.
    return saved;
  }
}
