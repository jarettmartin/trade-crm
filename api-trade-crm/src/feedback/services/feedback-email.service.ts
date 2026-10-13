import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';
import { EmailService } from '../../email/services/email.service';

/** Notifications left PENDING this long are assumed dead (crash/restart). */
const STALE_PENDING_AGE_MS = 30 * 60 * 1000;

/**
 * Handlebars template name in src/email/templates/ for feedback notifications.
 */
const FEEDBACK_EMAIL_TEMPLATE = 'feedback-email';

/**
 * Human-readable type labels — same copy as the web FeedbackPage. Exported so
 * the public contact-form notification reuses the exact same labels.
 */
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  [FeedbackType.FEEDBACK]: 'Feedback',
  [FeedbackType.BUG]: 'Bug',
  [FeedbackType.FEATURE_REQUEST]: 'Feature request',
  [FeedbackType.CONTACT]: 'Contact',
  [FeedbackType.EARLY_ACCESS]: 'Early Access',
};

/**
 * Emails an internal notification to the platform's support inbox whenever a
 * user submits feedback.
 *
 * Deliberately outside the user's world: the submission is saved first and the
 * notification is dispatched in the background, so a missing config, an SES
 * outage or a mail failure can never slow down or fail the user's request. The
 * outcome is only recorded on the feedback row (`emailStatus`, `emailMessageId`,
 * `emailErrorMessage`, `emailSentAt`) for support/debugging, and those columns
 * are stripped from every API response.
 *
 * Lifecycle of `emailStatus`: PENDING → SENT | FAILED (or SKIPPED when no
 * destination is configured). PENDING rows that never resolve (e.g. the server
 * restarted mid-send) are flagged FAILED on startup, the same way
 * `InvoiceEmailService` recovers its attempts.
 *
 * The destination is purely env-driven (`FEEDBACK_NOTIFY_EMAIL`, set in the
 * gitignored `.env` / `.env.production`) — no address is hardcoded here, so the
 * repo never carries a real support inbox. **Unset or empty means disabled**:
 * nothing is sent and submissions are recorded as SKIPPED. That is deliberate —
 * falling back to a placeholder would fire real SES sends at a non-existent
 * mailbox and burn sender reputation on bounces.
 */
@Injectable()
export class FeedbackEmailService implements OnModuleInit {
  private readonly logger = new Logger(FeedbackEmailService.name);
  private readonly notifyEmail: string;
  private readonly fromEmail: string;

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
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
        'FEEDBACK_NOTIFY_EMAIL is not set — feedback notification emails are disabled. ' +
          'Set it to the support inbox (e.g. in api-trade-crm/.env for local Docker ' +
          'or .env.production for the deployed API) to enable them.',
      );
    }

    // Recover notifications left PENDING by a crash or restart: re-sending
    // could double-deliver, so fail them explicitly and keep the history.
    const cutoff = new Date(Date.now() - STALE_PENDING_AGE_MS);
    const stale = await this.feedbackRepository.find({
      where: {
        emailStatus: FeedbackEmailStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
    });

    if (stale.length > 0) {
      await this.feedbackRepository.update(
        stale.map((f) => f.id),
        {
          emailStatus: FeedbackEmailStatus.FAILED,
          emailErrorMessage:
            'Notification send interrupted (server restarted before completion)',
        },
      );
      this.logger.warn(
        `Marked ${stale.length} stale PENDING feedback notification(s) as FAILED`,
      );
    }
  }

  /**
   * Destination for notifications, or `''` when they are disabled. Callers use
   * this to record PENDING vs SKIPPED up front, so a submission never sits in a
   * state that implies a send is coming when none is.
   */
  getNotificationRecipient(): string {
    return this.notifyEmail;
  }

  /**
   * Sends (and records) the notification for a saved submission.
   *
   * Never throws and never blocks: it is always invoked fire-and-forget from
   * `FeedbackService.create`, after the submission itself is committed.
   */
  async notify(feedback: Feedback): Promise<void> {
    if (!this.notifyEmail) {
      this.logger.warn(
        `Notification for feedback ${feedback.id} skipped: FEEDBACK_NOTIFY_EMAIL is not configured`,
      );
      return;
    }

    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: feedback.tenantId },
      });

      const subject = feedback.subject || '';
      const { subject: renderedSubject, textBody } =
        this.emailService.renderEmailTemplate(FEEDBACK_EMAIL_TEMPLATE, {
          businessName: tenant?.businessName || 'Unknown business',
          tenantId: feedback.tenantId,
          submittedAt: (feedback.createdAt
            ? new Date(feedback.createdAt)
            : new Date()
          ).toUTCString(),
          submitterEmail: feedback.userEmail || 'unknown',
          submitterUserId: feedback.userId || '(none)',
          feedbackId: feedback.id,
          typeLabel: FEEDBACK_TYPE_LABELS[feedback.type] ?? feedback.type,
          subjectLine: subject || '(no subject)',
          // Pre-formatted so the template stays logic-free (the same trick the
          // invoice template uses for its optional payment note).
          subjectBlock: subject ? `\nSubject:    ${subject}` : '',
          message: feedback.message,
        });

      if (!this.fromEmail) {
        throw new Error(
          'SES_FROM_EMAIL is not configured. Feedback notifications must be ' +
            'sent from a verified SES identity owned by the platform ' +
            '(e.g. no-reply@sprout-crm.com).',
        );
      }

      const { messageId } = await this.emailService.sendEmail({
        to: this.notifyEmail,
        from: this.fromEmail,
        // So support can reply straight to whoever submitted the feedback.
        replyTo: feedback.userEmail || undefined,
        subject: renderedSubject,
        textBody,
      });

      await this.feedbackRepository.update(feedback.id, {
        emailStatus: FeedbackEmailStatus.SENT,
        emailMessageId: messageId,
        emailSentAt: new Date(),
      });

      this.logger.log(
        `Feedback ${feedback.id} notification sent to ${this.notifyEmail} via SES (${messageId})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Feedback ${feedback.id} notification failed: ${message}`,
        stack,
      );

      try {
        await this.feedbackRepository.update(feedback.id, {
          emailStatus: FeedbackEmailStatus.FAILED,
          emailErrorMessage:
            message || 'Unknown error while sending the notification',
        });
      } catch (recordError: unknown) {
        // The submission itself is already saved, so there is nothing left to
        // do but log. Swallowing here also keeps this from surfacing as an
        // unhandled promise rejection on the fire-and-forget call.
        const recordMessage =
          recordError instanceof Error
            ? recordError.message
            : String(recordError);
        this.logger.error(
          `Could not record notification failure for feedback ${feedback.id}: ${recordMessage}`,
        );
      }
    }
  }
}
