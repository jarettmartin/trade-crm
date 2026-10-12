import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContactService } from './contact.service';
import { ContactEmailService } from './contact-email.service';
import { ContactSubmission } from '../entities/contact-submission.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';

/** Repository slice the service depends on, fully typed (no `any` mocks). */
function makeRepositoryMock() {
  return {
    create: jest.fn((input: Partial<ContactSubmission>) => input),
    save: jest.fn((input: Partial<ContactSubmission>) => input),
  };
}

/** The notification collaborator — its own behavior is covered by its spec. */
function makeContactEmailServiceMock() {
  return {
    getNotificationRecipient: jest.fn(() => 'support@example.com'),
    notify: jest.fn<(submission: ContactSubmission) => Promise<void>>(),
  };
}

type ContactRepositoryMock = ReturnType<typeof makeRepositoryMock>;
type ContactEmailServiceMock = ReturnType<typeof makeContactEmailServiceMock>;

describe('ContactService', () => {
  let service: ContactService;
  let repository: ContactRepositoryMock;
  let contactEmailService: ContactEmailServiceMock;

  beforeEach(async () => {
    repository = makeRepositoryMock();
    contactEmailService = makeContactEmailServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: getRepositoryToken(ContactSubmission),
          useValue: repository,
        },
        { provide: ContactEmailService, useValue: contactEmailService },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  describe('create', () => {
    it('stores the visitor input trimmed, with no tenant/author stamped', async () => {
      repository.save.mockImplementation((input) => ({
        ...input,
        id: 'contact-1',
      }));

      const result = await service.create({
        type: FeedbackType.EARLY_ACCESS,
        email: '  visitor@example.com  ',
        subject: '  Interested in the program  ',
        message: '  Tell me more please.  ',
      });

      // No tenantId/userId/userEmail — a public visitor has no identity.
      expect(repository.create).toHaveBeenCalledWith({
        type: FeedbackType.EARLY_ACCESS,
        email: 'visitor@example.com',
        subject: 'Interested in the program',
        message: 'Tell me more please.',
        emailStatus: FeedbackEmailStatus.PENDING,
        emailRecipient: 'support@example.com',
      });
      expect(result.id).toBe('contact-1');
    });

    it('fires the internal notification in the background', async () => {
      repository.save.mockImplementation((input) => ({
        ...input,
        id: 'contact-1',
      }));

      await service.create({
        type: FeedbackType.CONTACT,
        email: 'visitor@example.com',
        message: 'Hello',
      });

      expect(contactEmailService.notify).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'contact-1' }),
      );
    });

    it('records SKIPPED and sends nothing when notifications are disabled', async () => {
      contactEmailService.getNotificationRecipient.mockReturnValue('');

      await service.create({
        type: FeedbackType.CONTACT,
        email: 'visitor@example.com',
        message: 'Hello',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailStatus: FeedbackEmailStatus.SKIPPED,
          emailRecipient: undefined,
        }),
      );
      expect(contactEmailService.notify).not.toHaveBeenCalled();
    });

    it('drops a blank subject instead of storing whitespace', async () => {
      await service.create({
        type: FeedbackType.CONTACT,
        email: 'visitor@example.com',
        subject: '   ',
        message: 'Please call me',
      });

      const created = repository.create.mock.calls[0][0];

      expect(created.subject).toBeUndefined();
      expect(created.message).toBe('Please call me');
    });

    it('returns the saved entity untouched for the serializer to shape', async () => {
      repository.save.mockImplementation((input) => ({
        ...input,
        id: 'contact-1',
        emailMessageId: 'ses-1',
      }));

      const result = await service.create({
        type: FeedbackType.CONTACT,
        email: 'visitor@example.com',
        message: 'Hello',
      });

      expect(result).toMatchObject({
        id: 'contact-1',
        emailMessageId: 'ses-1',
      });
    });
  });
});
