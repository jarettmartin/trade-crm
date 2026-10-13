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
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';
import { EmailThrottlerGuard } from '../../email/guards/email-throttler.guard';

// TenantGuard imports jwks-rsa → jose, which ships ESM only and cannot be
// parsed by this Jest setup. A factory mock (rather than the automatic one)
// keeps the real module from ever being loaded; the guard itself is stubbed out
// below, so none of this is exercised.
jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn(() => ({ getSigningKey: jest.fn() })),
}));

const TENANT_ID = 'tenant-1';

/**
 * The five notification columns the submitting user must never see. Asserted as
 * a list so a future column is added in one place.
 */
const INTERNAL_EMAIL_FIELDS = [
  'emailStatus',
  'emailRecipient',
  'emailMessageId',
  'emailErrorMessage',
  'emailSentAt',
];

/**
 * A row as TypeORM hands it back — a real `Feedback` *instance* with every
 * internal notification column populated. Being an instance is the whole point:
 * `@Exclude()` is applied by class-transformer, which only sees decorators on
 * class instances, so a test using a plain object literal would pass while the
 * real endpoint leaked.
 */
function makeFeedback(overrides: Partial<Feedback> = {}): Feedback {
  const feedback = new Feedback();
  Object.assign(feedback, {
    id: 'feedback-1',
    tenantId: TENANT_ID,
    userId: 'user-1',
    userEmail: 'user@example.com',
    type: FeedbackType.BUG,
    subject: 'Save button does nothing',
    message: 'Clicking save does nothing on mobile.',
    createdAt: new Date('2026-09-25T12:00:00.000Z'),
    updatedAt: new Date('2026-09-25T12:00:00.000Z'),
    emailStatus: FeedbackEmailStatus.SENT,
    emailRecipient: 'support@example.com',
    emailMessageId: 'ses-1',
    emailErrorMessage: 'a previous attempt failed',
    emailSentAt: new Date('2026-09-25T12:00:05.000Z'),
    ...overrides,
  });
  return feedback;
}

interface FeedbackPayload {
  id: string;
  type: string;
  subject?: string;
  message: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
}

interface PaginatedFeedbackPayload {
  data: FeedbackPayload[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

describe('FeedbackController (serialization)', () => {
  let app: INestApplication<App>;
  let feedbackService: {
    create: jest.Mock<
      (
        dto: CreateFeedbackDto,
        tenantId: string,
        userId?: string,
        userEmail?: string,
      ) => Promise<Feedback>
    >;
    findAll: jest.Mock<
      (
        tenantId: string,
        page: number,
        limit: number,
      ) => Promise<{
        data: Feedback[];
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>
    >;
  };

  beforeEach(async () => {
    feedbackService = {
      create: jest.fn(() => Promise.resolve(makeFeedback())),
      findAll: jest.fn(() =>
        Promise.resolve({
          data: [makeFeedback()],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: feedbackService }],
    })
      // The guard normally verifies a Cognito token against JWKS and the DB;
      // here it just needs to stand in for an authenticated tenant user.
      .overrideGuard(TenantGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => { user?: unknown };
          };
        }) => {
          context.switchToHttp().getRequest().user = {
            uid: 'cognito-sub-1',
            email: 'user@example.com',
            emailVerified: true,
            tenantId: TENANT_ID,
            localUserId: 'user-1',
          };
          return true;
        },
      })
      // The throttler has its own integration spec; here it only needs to let
      // requests through so the serialization assertions can run.
      .overrideGuard(EmailThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    // Same pipe configuration as src/main.ts. Without it the DTO's
    // @Transform/@MinLength rules would never run, and tests could "pass" while
    // the real endpoint accepts input it should reject.
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

  it('POST /feedback omits the internal notification columns', async () => {
    const response = await request(app.getHttpServer())
      .post('/feedback')
      .send({ type: FeedbackType.BUG, message: 'Clicking save does nothing.' })
      .expect(201);

    for (const field of INTERNAL_EMAIL_FIELDS) {
      expect(response.body).not.toHaveProperty(field);
    }
  });

  it('POST /feedback still returns the client-facing fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/feedback')
      .send({ type: FeedbackType.BUG, message: 'Clicking save does nothing.' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'feedback-1',
      type: FeedbackType.BUG,
      subject: 'Save button does nothing',
      message: 'Clicking save does nothing on mobile.',
      userId: 'user-1',
      userEmail: 'user@example.com',
      createdAt: '2026-09-25T12:00:00.000Z',
    });
  });

  it('GET /feedback omits them from every row inside the paginated wrapper', async () => {
    const response = await request(app.getHttpServer())
      .get('/feedback')
      .expect(200);

    const body = response.body as PaginatedFeedbackPayload;
    expect(body.data).toHaveLength(1);
    for (const row of body.data as unknown as Record<string, unknown>[]) {
      for (const field of INTERNAL_EMAIL_FIELDS) {
        expect(row).not.toHaveProperty(field);
      }
    }
  });

  it('GET /feedback leaves the pagination meta untouched', async () => {
    const response = await request(app.getHttpServer())
      .get('/feedback')
      .expect(200);

    const body = response.body as PaginatedFeedbackPayload;
    expect(body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('scopes the query to the caller tenant from the token', async () => {
    await request(app.getHttpServer()).get('/feedback').expect(200);

    expect(feedbackService.findAll).toHaveBeenCalledWith(TENANT_ID, 1, 10);
  });

  describe('submit validation', () => {
    it('rejects a whitespace-only message instead of storing an empty one', async () => {
      // Regression: without a trimming @Transform on the DTO, "   " satisfied
      // @MinLength(1) and was then saved trimmed to "".
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ type: FeedbackType.BUG, message: '   ' })
        .expect(400);

      expect(feedbackService.create).not.toHaveBeenCalled();
    });

    it('normalizes the whitespace around the stored fields', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({
          type: FeedbackType.BUG,
          subject: '  Broken save button  ',
          message: '  Clicking save does nothing.  ',
        })
        .expect(201);

      expect(feedbackService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Broken save button',
          message: 'Clicking save does nothing.',
        }),
        TENANT_ID,
        'user-1',
        'user@example.com',
      );
    });

    it('treats a whitespace-only subject as absent', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({
          type: FeedbackType.CONTACT,
          subject: '   ',
          message: 'Please call me back.',
        })
        .expect(201);

      expect(feedbackService.create).toHaveBeenCalledWith(
        expect.objectContaining({ subject: undefined }),
        TENANT_ID,
        'user-1',
        'user@example.com',
      );
    });

    it('rejects a message over 1000 characters', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ type: FeedbackType.BUG, message: 'a'.repeat(1001) })
        .expect(400);

      expect(feedbackService.create).not.toHaveBeenCalled();
    });

    it('accepts a message of exactly 1000 characters', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ type: FeedbackType.BUG, message: 'a'.repeat(1000) })
        .expect(201);
    });

    it('rejects an unknown type', async () => {
      await request(app.getHttpServer())
        .post('/feedback')
        .send({ type: 'NOT_A_TYPE', message: 'Hello' })
        .expect(400);
    });

    it('rejects tenant/author fields injected in the body', async () => {
      // tenantId/userId/userEmail come from the verified token only.
      await request(app.getHttpServer())
        .post('/feedback')
        .send({
          type: FeedbackType.BUG,
          message: 'Hello',
          tenantId: 'other-tenant',
          userId: 'someone-else',
        })
        .expect(400);

      expect(feedbackService.create).not.toHaveBeenCalled();
    });
  });
});
