import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import type { FindManyOptions } from 'typeorm';
import { FeedbackEmailService } from './feedback-email.service';
import { EmailService } from '../../email/services/email.service';
import type { SendEmailParams } from '../../email/services/email.service';
import type { RenderedEmailTemplate } from '../../email/email-templates';
import { Feedback } from '../entities/feedback.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';

const NOTIFY_EMAIL = 'sproutfb@example.com';
const FROM_EMAIL = 'no-reply@sprout-crm.com';

/**
 * Repository slice used by the service, with inferred (type-checked) mocks.
 * The service injects the Tenant repository too, which is exercised through the
 * same `findOne` mock.
 */
function makeRepositoryMock() {
  return {
    find: jest.fn<
      (options: FindManyOptions<Feedback>) => Promise<Feedback[]>
    >(),
    update:
      jest.fn<(id: string | string[], patch: object) => Promise<unknown>>(),
    findOne: jest.fn<(options: object) => Promise<Tenant | null>>(),
  };
}

/** ConfigService returning the given env values, else the caller's default. */
function makeConfigServiceMock(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) =>
      key in values ? values[key] : defaultValue,
    ),
  };
}

function makeEmailServiceMock() {
  return {
    // Declared with the full signature (implementation may use fewer params) so
    // `toHaveBeenCalledWith(name, context)` is type-checked with both args.
    renderEmailTemplate: jest.fn<
      (name: string, context: Record<string, unknown>) => RenderedEmailTemplate
    >((name) => ({
      subject: `rendered subject for ${name}`,
      textBody: 'rendered body',
    })),
    sendEmail: jest.fn<
      (params: SendEmailParams) => Promise<{ messageId: string }>
    >((params) => Promise.resolve({ messageId: `ses-${params.to}` })),
  };
}

function makeFeedback(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 'feedback-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    userEmail: 'user@example.com',
    type: FeedbackType.BUG,
    subject: 'Save button does nothing',
    message: 'Clicking save does nothing on mobile.',
    createdAt: new Date('2026-09-25T12:00:00.000Z'),
    ...overrides,
  } as Feedback;
}

describe('FeedbackEmailService', () => {
  let service: FeedbackEmailService;
  let feedbackRepository: ReturnType<typeof makeRepositoryMock>;
  let emailService: ReturnType<typeof makeEmailServiceMock>;

  async function build(env: Record<string, string> = {}) {
    feedbackRepository = makeRepositoryMock();
    emailService = makeEmailServiceMock();
    feedbackRepository.findOne.mockResolvedValue({
      id: 'tenant-1',
      businessName: 'Sprout Landscaping',
    } as Tenant);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackEmailService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: feedbackRepository,
        },
        { provide: getRepositoryToken(Tenant), useValue: feedbackRepository },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: makeConfigServiceMock({
            FEEDBACK_NOTIFY_EMAIL: NOTIFY_EMAIL,
            SES_FROM_EMAIL: FROM_EMAIL,
            ...env,
          }),
        },
      ],
    }).compile();

    service = module.get<FeedbackEmailService>(FeedbackEmailService);
  }

  beforeEach(async () => {
    await build();
  });

  it('exposes the configured recipient', () => {
    expect(service.getNotificationRecipient()).toBe(NOTIFY_EMAIL);
  });

  it('treats an unset env var as disabled (no address is hardcoded)', async () => {
    // The destination is purely env-driven: an unset value must not fall back
    // to a hardcoded inbox, or a deploy without the var would send real SES
    // mail to an address nobody owns.
    await build({ FEEDBACK_NOTIFY_EMAIL: undefined as unknown as string });

    expect(service.getNotificationRecipient()).toBe('');
  });

  it('treats a whitespace-only env var as disabled', async () => {
    await build({ FEEDBACK_NOTIFY_EMAIL: '   ' });

    expect(service.getNotificationRecipient()).toBe('');
  });

  describe('notify', () => {
    it('renders the template with the submission context and sends it', async () => {
      await service.notify(makeFeedback());

      expect(emailService.renderEmailTemplate).toHaveBeenCalledWith(
        'feedback-email',
        expect.objectContaining({
          businessName: 'Sprout Landscaping',
          tenantId: 'tenant-1',
          submitterEmail: 'user@example.com',
          submitterUserId: 'user-1',
          feedbackId: 'feedback-1',
          typeLabel: 'Bug',
          subjectLine: 'Save button does nothing',
          subjectBlock: '\nSubject:    Save button does nothing',
          message: 'Clicking save does nothing on mobile.',
        }),
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: NOTIFY_EMAIL,
        from: FROM_EMAIL,
        replyTo: 'user@example.com',
        subject: 'rendered subject for feedback-email',
        textBody: 'rendered body',
      });
    });

    it('records SENT with the SES message id', async () => {
      await service.notify(makeFeedback());

      expect(feedbackRepository.update).toHaveBeenCalledWith('feedback-1', {
        emailStatus: FeedbackEmailStatus.SENT,
        emailMessageId: `ses-${NOTIFY_EMAIL}`,
        emailSentAt: expect.any(Date) as unknown as Date,
      });
    });

    it('omits the subject block when the submission has no subject', async () => {
      await service.notify(makeFeedback({ subject: undefined }));

      expect(emailService.renderEmailTemplate).toHaveBeenCalledWith(
        'feedback-email',
        expect.objectContaining({
          subjectLine: '(no subject)',
          subjectBlock: '',
        }),
      );
    });

    it('records FAILED and never throws when the send fails', async () => {
      emailService.sendEmail.mockRejectedValueOnce(new Error('SES is down'));

      await expect(service.notify(makeFeedback())).resolves.toBeUndefined();

      expect(feedbackRepository.update).toHaveBeenCalledWith('feedback-1', {
        emailStatus: FeedbackEmailStatus.FAILED,
        emailErrorMessage: 'SES is down',
      });
    });

    it('swallows a failure to record the failure', async () => {
      emailService.sendEmail.mockRejectedValueOnce(new Error('SES is down'));
      feedbackRepository.update.mockRejectedValueOnce(new Error('db is down'));

      await expect(service.notify(makeFeedback())).resolves.toBeUndefined();
    });

    it('does nothing when notifications are disabled', async () => {
      await build({ FEEDBACK_NOTIFY_EMAIL: '' });

      await service.notify(makeFeedback());

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(emailService.renderEmailTemplate).not.toHaveBeenCalled();
      expect(feedbackRepository.update).not.toHaveBeenCalled();
    });

    it('tolerates a missing tenant without failing the notification', async () => {
      feedbackRepository.findOne.mockResolvedValueOnce(null);

      await service.notify(makeFeedback());

      expect(emailService.renderEmailTemplate).toHaveBeenCalledWith(
        'feedback-email',
        expect.objectContaining({ businessName: 'Unknown business' }),
      );
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('onModuleInit (stale PENDING recovery)', () => {
    it('flags interrupted notifications as FAILED', async () => {
      feedbackRepository.find.mockResolvedValue([
        makeFeedback({ id: 'feedback-1' }),
        makeFeedback({ id: 'feedback-2' }),
      ]);

      await service.onModuleInit();

      expect(feedbackRepository.update).toHaveBeenCalledWith(
        ['feedback-1', 'feedback-2'],
        {
          emailStatus: FeedbackEmailStatus.FAILED,
          emailErrorMessage:
            'Notification send interrupted (server restarted before completion)',
        },
      );
    });

    it('does nothing when there is nothing stale', async () => {
      feedbackRepository.find.mockResolvedValue([]);

      await service.onModuleInit();

      expect(feedbackRepository.update).not.toHaveBeenCalled();
    });
  });
});
