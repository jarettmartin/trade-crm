import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { FindManyOptions } from 'typeorm';
import { FeedbackService } from './feedback.service';
import { FeedbackEmailService } from './feedback-email.service';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';

/**
 * Builds the repository slice the service depends on. Every method is a jest
 * mock whose types are inferred from its implementation, so
 * `mockImplementation` / `mockResolvedValue` calls are fully type-checked (no
 * `any`-typed mocks).
 */
function makeRepositoryMock() {
  return {
    create: jest.fn((input: Partial<Feedback>) => input),
    save: jest.fn((input: Partial<Feedback>) => input),
    findAndCount:
      jest.fn<
        (
          options: FindManyOptions<Feedback>,
        ) => Promise<[Partial<Feedback>[], number]>
      >(),
  };
}

/** The notification collaborator — its own behavior is covered by its spec. */
function makeFeedbackEmailServiceMock() {
  return {
    getNotificationRecipient: jest.fn(() => 'support@example.com'),
    notify: jest.fn<(feedback: Feedback) => Promise<void>>(),
  };
}

type FeedbackRepositoryMock = ReturnType<typeof makeRepositoryMock>;
type FeedbackEmailServiceMock = ReturnType<typeof makeFeedbackEmailServiceMock>;

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repository: FeedbackRepositoryMock;
  let feedbackEmailService: FeedbackEmailServiceMock;

  beforeEach(async () => {
    repository = makeRepositoryMock();
    feedbackEmailService = makeFeedbackEmailServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: repository,
        },
        { provide: FeedbackEmailService, useValue: feedbackEmailService },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('create', () => {
    it('stamps tenant/author from the caller and trims input', async () => {
      repository.save.mockImplementation((input) => ({
        ...input,
        id: 'feedback-1',
      }));

      const result = await service.create(
        {
          type: FeedbackType.BUG,
          subject: '  Broken button  ',
          message: '  The save button does nothing  ',
        },
        'tenant-1',
        'user-1',
        'user@example.com',
      );

      expect(repository.create).toHaveBeenCalledWith({
        type: FeedbackType.BUG,
        subject: 'Broken button',
        message: 'The save button does nothing',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        emailStatus: FeedbackEmailStatus.PENDING,
        emailRecipient: 'support@example.com',
      });
      expect(result.id).toBe('feedback-1');
    });

    it('fires the internal notification in the background', async () => {
      repository.save.mockImplementation((input) => ({
        ...input,
        id: 'feedback-1',
      }));

      await service.create(
        { type: FeedbackType.BUG, message: 'It broke' },
        'tenant-1',
        'user-1',
        'user@example.com',
      );

      expect(feedbackEmailService.notify).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'feedback-1' }),
      );
    });

    it('records SKIPPED and sends nothing when notifications are disabled', async () => {
      feedbackEmailService.getNotificationRecipient.mockReturnValue('');

      await service.create(
        { type: FeedbackType.BUG, message: 'It broke' },
        'tenant-1',
        'user-1',
        'user@example.com',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailStatus: FeedbackEmailStatus.SKIPPED,
          emailRecipient: undefined,
        }),
      );
      expect(feedbackEmailService.notify).not.toHaveBeenCalled();
    });

    it('returns the saved entity untouched for the serializer to shape', async () => {
      // Hiding the internal notification columns is the job of
      // ClassSerializerInterceptor + @Exclude() on the entity — see
      // feedback.controller.spec.ts. The service must therefore hand the
      // entity back as-is rather than partially mapping it.
      repository.save.mockImplementation((input) => ({
        ...input,
        id: 'feedback-1',
        emailMessageId: 'ses-1',
      }));

      const result = await service.create(
        { type: FeedbackType.BUG, message: 'It broke' },
        'tenant-1',
        'user-1',
        'user@example.com',
      );

      expect(result).toMatchObject({
        id: 'feedback-1',
        emailMessageId: 'ses-1',
      });
    });

    it('drops a blank subject instead of storing whitespace', async () => {
      await service.create(
        {
          type: FeedbackType.CONTACT,
          subject: '   ',
          message: 'Please call me',
        },
        'tenant-1',
        'user-1',
        'user@example.com',
      );

      const created = repository.create.mock.calls[0][0];

      expect(created.subject).toBeUndefined();
      expect(created.message).toBe('Please call me');
    });
  });

  describe('findAll', () => {
    it('scopes to the tenant, orders newest-first, and paginates', async () => {
      repository.findAndCount.mockResolvedValue([[{ id: 'feedback-1' }], 12]);

      const result = await service.findAll('tenant-1', 2, 5);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { createdAt: 'DESC' },
        skip: 5,
        take: 5,
      });
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
      });
    });
  });
});
