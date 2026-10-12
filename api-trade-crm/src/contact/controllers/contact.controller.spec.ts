import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ContactController } from './contact.controller';
import { ContactService } from '../services/contact.service';
import { CreateContactSubmissionDto } from '../dto/create-contact-submission.dto';
import { ContactSubmission } from '../entities/contact-submission.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';

/**
 * The five notification columns the visitor must never see. Asserted as a list
 * so a future column is added in one place.
 */
const INTERNAL_EMAIL_FIELDS = [
  'emailStatus',
  'emailRecipient',
  'emailMessageId',
  'emailErrorMessage',
  'emailSentAt',
];

/**
 * A row as TypeORM hands it back — a real `ContactSubmission` *instance* with
 * every internal column populated. Being an instance is the point: `@Exclude()`
 * only applies to class instances, so a plain object literal would pass while
 * the real endpoint leaked.
 */
function makeSubmission(
  overrides: Partial<ContactSubmission> = {},
): ContactSubmission {
  const submission = new ContactSubmission();
  Object.assign(submission, {
    id: 'contact-1',
    email: 'visitor@example.com',
    type: FeedbackType.EARLY_ACCESS,
    subject: 'Interested',
    message: 'Tell me more about the program.',
    createdAt: new Date('2026-10-12T12:00:00.000Z'),
    updatedAt: new Date('2026-10-12T12:00:00.000Z'),
    emailStatus: FeedbackEmailStatus.SENT,
    emailRecipient: 'support@example.com',
    emailMessageId: 'ses-1',
    emailErrorMessage: 'a previous attempt failed',
    emailSentAt: new Date('2026-10-12T12:00:05.000Z'),
    ...overrides,
  });
  return submission;
}

describe('ContactController', () => {
  let app: INestApplication<App>;
  let contactService: {
    create: jest.Mock<
      (dto: CreateContactSubmissionDto) => Promise<ContactSubmission>
    >;
  };

  beforeEach(async () => {
    contactService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [{ provide: ContactService, useValue: contactService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the submission without the internal notification columns', async () => {
    contactService.create.mockResolvedValue(makeSubmission());

    const response = await request(app.getHttpServer())
      .post('/contact')
      .send({
        type: FeedbackType.EARLY_ACCESS,
        email: 'visitor@example.com',
        message: 'Tell me more about the program.',
      })
      .expect(201);

    const body = response.body as Record<string, unknown>;
    for (const field of INTERNAL_EMAIL_FIELDS) {
      expect(body).not.toHaveProperty(field);
    }
    expect(body.id).toBe('contact-1');
    expect(body.type).toBe(FeedbackType.EARLY_ACCESS);
  });

  it('normalizes the whitespace around the stored fields', async () => {
    contactService.create.mockResolvedValue(makeSubmission());

    await request(app.getHttpServer())
      .post('/contact')
      .send({
        type: FeedbackType.CONTACT,
        email: '  visitor@example.com  ',
        subject: '  Hello  ',
        message: '  Please get in touch.  ',
      })
      .expect(201);

    expect(contactService.create).toHaveBeenCalledWith({
      type: FeedbackType.CONTACT,
      email: 'visitor@example.com',
      subject: 'Hello',
      message: 'Please get in touch.',
    });
  });

  describe('submit validation', () => {
    it('rejects an unknown subject type', async () => {
      await request(app.getHttpServer())
        .post('/contact')
        .send({ type: 'NOT_A_TYPE', email: 'a@b.com', message: 'Hi' })
        .expect(400);

      expect(contactService.create).not.toHaveBeenCalled();
    });

    it('rejects an in-app-only feedback type (BUG)', async () => {
      // The public form only accepts the contact subject types.
      await request(app.getHttpServer())
        .post('/contact')
        .send({ type: FeedbackType.BUG, email: 'a@b.com', message: 'Hi' })
        .expect(400);

      expect(contactService.create).not.toHaveBeenCalled();
    });

    it('requires a valid email', async () => {
      await request(app.getHttpServer())
        .post('/contact')
        .send({
          type: FeedbackType.CONTACT,
          email: 'not-an-email',
          message: 'Hi',
        })
        .expect(400);

      expect(contactService.create).not.toHaveBeenCalled();
    });

    it('rejects a whitespace-only message', async () => {
      await request(app.getHttpServer())
        .post('/contact')
        .send({ type: FeedbackType.CONTACT, email: 'a@b.com', message: '   ' })
        .expect(400);

      expect(contactService.create).not.toHaveBeenCalled();
    });

    it('rejects a message over 1000 characters', async () => {
      await request(app.getHttpServer())
        .post('/contact')
        .send({
          type: FeedbackType.CONTACT,
          email: 'a@b.com',
          message: 'a'.repeat(1001),
        })
        .expect(400);
    });

    it('rejects fields injected in the body', async () => {
      await request(app.getHttpServer())
        .post('/contact')
        .send({
          type: FeedbackType.CONTACT,
          email: 'a@b.com',
          message: 'Hi',
          tenantId: 'other-tenant',
        })
        .expect(400);

      expect(contactService.create).not.toHaveBeenCalled();
    });
  });
});
