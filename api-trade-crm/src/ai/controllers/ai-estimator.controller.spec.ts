import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  HttpException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AiEstimatorController } from './ai-estimator.controller';
import { AiEstimatorService } from '../services/ai-estimator.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AI_DESCRIPTION_MAX_LENGTH } from '../ai-estimator.config';

// TenantGuard imports jwks-rsa → jose, which ships ESM only and cannot be
// parsed by this Jest setup. A factory mock keeps the real module from loading;
// the guard is overridden below, so none of it is exercised.
jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn(() => ({ getSigningKey: jest.fn() })),
}));

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';
const DESCRIPTION =
  'Replace two outdoor light fixtures, inspect the existing wiring, and supply weatherproof fittings.';

const RESULT = {
  suggestions: [
    {
      catalogItemId: 'cat-light',
      type: 'SERVICE',
      description: 'Replace outdoor light fixture',
      unitPrice: 120,
      quantity: 2,
      matchReason: 'matches the fixture replacement',
    },
  ],
  followUpQuestions: [],
  usage: {
    limit: 3,
    used: 1,
    remaining: 2,
    resetAt: '2026-10-13T23:00:00.000Z',
  },
};

describe('AiEstimatorController', () => {
  let app: INestApplication<App>;
  let aiEstimatorService: {
    estimate: jest.Mock<
      (
        description: string,
        userId: string,
        tenantId: string,
      ) => Promise<unknown>
    >;
    getUsage: jest.Mock<(userId: string) => Promise<unknown>>;
  };

  beforeEach(async () => {
    aiEstimatorService = {
      estimate: jest.fn(() => Promise.resolve(RESULT)),
      getUsage: jest.fn(() => Promise.resolve(RESULT.usage)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AiEstimatorController],
      providers: [
        { provide: AiEstimatorService, useValue: aiEstimatorService },
      ],
    })
      // Stand-in for a verified Cognito user with a tenant.
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
            localUserId: USER_ID,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // Same pipe configuration as src/main.ts, so DTO rules actually run.
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

  it('POST returns the suggestions and the caller budget', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: DESCRIPTION })
      .expect(201);

    expect(response.body).toMatchObject({
      suggestions: RESULT.suggestions,
      usage: RESULT.usage,
    });
  });

  it('scopes the call to the tenant and user from the token', async () => {
    await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: DESCRIPTION })
      .expect(201);

    expect(aiEstimatorService.estimate).toHaveBeenCalledWith(
      DESCRIPTION,
      USER_ID,
      TENANT_ID,
    );
  });

  it('normalizes whitespace around the description', async () => {
    await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: `   ${DESCRIPTION}   ` })
      .expect(201);

    expect(aiEstimatorService.estimate).toHaveBeenCalledWith(
      DESCRIPTION,
      USER_ID,
      TENANT_ID,
    );
  });

  it('rejects an empty/whitespace-only description without a provider call', async () => {
    await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: '   ' })
      .expect(400);

    expect(aiEstimatorService.estimate).not.toHaveBeenCalled();
  });

  it('rejects an oversized description', async () => {
    await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: 'a'.repeat(AI_DESCRIPTION_MAX_LENGTH + 1) })
      .expect(400);

    expect(aiEstimatorService.estimate).not.toHaveBeenCalled();
  });

  it('rejects injected tenant/user fields', async () => {
    await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: DESCRIPTION, tenantId: 'other', userId: 'else' })
      .expect(400);
  });

  it('rejects a jobId — this endpoint can never create line items', async () => {
    await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: DESCRIPTION, jobId: 'job-1' })
      .expect(400);

    expect(aiEstimatorService.estimate).not.toHaveBeenCalled();
  });

  it('forwards the 429 limit response', async () => {
    aiEstimatorService.estimate.mockRejectedValue(
      new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'AI estimator limit reached (3 requests per hour).',
          retryAfterSeconds: 1200,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/ai/catalog-matches')
      .send({ description: DESCRIPTION })
      .expect(429);

    const body = response.body as { message?: string };
    expect(body.message).toContain('limit reached');
  });

  it('GET usage returns the caller budget', async () => {
    const response = await request(app.getHttpServer())
      .get('/ai/catalog-matches/usage')
      .expect(200);

    expect(response.body).toEqual(RESULT.usage);
    expect(aiEstimatorService.getUsage).toHaveBeenCalledWith(USER_ID);
  });
});
