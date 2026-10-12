import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan } from 'typeorm';
import { ContactSubmission } from '../entities/contact-submission.entity';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';
import { EmailService } from '../../email/services/email.service';
import { FEEDBACK_TYPE_LABELS } from '../../feedback/services/feedback-email.service';

/** Notifications left PENDING this long are assumed dead (crash/restart). */
const STALE_PENDING_AGE_MS = 30 * 60 * 1000;

/** Handlebars template name in src/email/templates/ for contact notifications. */
const CONTACT_EMAIL_TEMPLATE = 'contact-email';

/**
 * Emails an internal notification whenever a visitor submits the public contact
 * form. The exact counterpart of `FeedbackEmailService` — same SES pipeline,
 * same PENDING → SENT | FAILED | SKIPPED bookkeeping, same startup recovery of
 * stale PENDING rows — minus the tenant lookup, because a public submission has
 * no tenant.
 *
 * Destination is the same env-driven `FEEDBACK_NOTIFY_EMAIL` (unset/empty means
 * disabled and submissions are recorded as SKIPPED). Failures are recorded on
 * the row and never surface to the visitor.
 */
@Injectable()
export class ContactEmailService implements OnModuleInit {
  private readonly logger = new Logger(ContactEmailService.name);
  private readonly notifyEmail: string;
  private readonly fromEmail: string;

  constructor(
    @InjectRepository(ContactSubmission)
    private readonly contactRepository: Repository<ContactSubmission>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.notifyEmail = (
      this.configService.get<string>('FEEDBACK_NOTIFY_EMAIL') ?? ''
    ).trim();
    this.fromEmail = this.configService.get<string>('SES_FROM_EMAIL', '');
  }

  async onModuleInit() {
    if (!this.notifyEmail) {
      this.logger.warn(
        'FEEDBACK_NOTIFY_EMAIL is not set — contact-form notification emails are disabled. ' +
          'Set it to the support inbox (e.g. in api-trade-crm/.env for local Docker ' +
          'or .env.production for the deployed API) to enable them.',
      );
    }

    // Recover notifications left PENDING by a crash or restart: re-sending
    // could double-deliver, so fail them explicitly and keep the history.
    const cutoff = new Date(Date.now() - STALE_PENDING_AGE_MS);
    const stale = await this.contactRepository.find({
      where: {
        emailStatus: FeedbackEmailStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
    });

    if (stale.length > 0) {
      await this.contactRepository.update(
        stale.map((c) => c.id),
        {
          emailStatus: FeedbackEmailStatus.FAILED,
          emailErrorMessage:
            'Notification send interrupted (server restarted before completion)',
        },
      );
      this.logger.warn(
        `Marked ${stale.length} stale PENDING contact notification(s) as FAILED`,
      );
    }
  }

  /**
   * Destination for notifications, or `''` when they are disabled. Callers use
   * this to record PENDING vs SKIPPED up front.
   */
  getNotificationRecipient(): string {
    return this.notifyEmail;
  }

  /**
   * Sends (and records) the notification for a saved submission.
   *
   * Never throws and never blocks: always invoked fire-and-forget from
   * `ContactService.create`, after the submission itself is committed.
   */
  async notify(submission: ContactSubmission): Promise<void> {
    if (!this.notifyEmail) {
      this.logger.warn(
        `Notification for contact submission ${submission.id} skipped: FEEDBACK_NOTIFY_EMAIL is not configured`,
      );
      return;
    }

    try {
      const subject = submission.subject || '';
      const { subject: renderedSubject, textBody } =
        this.emailService.renderEmailTemplate(CONTACT_EMAIL_TEMPLATE, {
          submittedAt: (submission.createdAt
            ? new Date(submission.createdAt)
            : new Date()
          ).toUTCString(),
          email: submission.email || 'unknown',
          submissionId: submission.id,
          typeLabel: FEEDBACK_TYPE_LABELS[submission.type] ?? submission.type,
          subjectLine: subject || '(no subject)',
          // Pre-formatted so the template stays logic-free.
          subjectBlock: subject ? `\nSubject:    ${subject}` : '',
          message: submission.message,
        });

      if (!this.fromEmail) {
        throw new Error(
          'SES_FROM_EMAIL is not configured. Contact notifications must be ' +
            'sent from a verified SES identity owned by the platform ' +
            '(e.g. no-reply@sprout-crm.com).',
        );
      }

      const { messageId } = await this.emailService.sendEmail({
        to: this.notifyEmail,
        from: this.fromEmail,
        // So support can reply straight back to the visitor.
        replyTo: submission.email || undefined,
        subject: renderedSubject,
        textBody,
      });

      await this.contactRepository.update(submission.id, {
        emailStatus: FeedbackEmailStatus.SENT,
        emailMessageId: messageId,
        emailSentAt: new Date(),
      });

      this.logger.log(
        `Contact submission ${submission.id} notification sent to ${this.notifyEmail} via SES (${messageId})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Contact submission ${submission.id} notification failed: ${message}`,
        stack,
      );

      try {
        await this.contactRepository.update(submission.id, {
          emailStatus: FeedbackEmailStatus.FAILED,
          emailErrorMessage:
            message || 'Unknown error while sending the notification',
        });
      } catch (recordError: unknown) {
        const recordMessage =
          recordError instanceof Error
            ? recordError.message
            : String(recordError);
        this.logger.error(
          `Could not record notification failure for contact submission ${submission.id}: ${recordMessage}`,
        );
      }
    }
  }
}
