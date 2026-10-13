import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Throttle } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { EmailModule } from '../email.module';
import { EmailThrottlerGuard } from './email-throttler.guard';
import { EMAIL_RATE_WINDOW_MS } from '../email-throttle.config';

/** Budget under test — the real one is asserted in each controller's spec. */
const TEST_LIMIT = 3;

/** Stands in for `TenantGuard`: puts a tenant on the request from a header. */
@Injectable()
class StubTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { tenantId?: string };
    }>();
    const tenantId = request.headers['x-test-tenant'];
    if (tenantId) {
      request.user = { tenantId };
    }
    return true;
  }
}

/**
 * Mirrors the two real shapes: an authenticated route (TenantGuard then
 * EmailThrottlerGuard) and the public one (EmailThrottlerGuard alone).
 */
@Controller('test-email')
class TestEmailController {
  @Get('tenant')
  @UseGuards(StubTenantGuard, EmailThrottlerGuard)
  @Throttle({
    default: { limit: TEST_LIMIT, ttl: EMAIL_RATE_WINDOW_MS },
  })
  tenant() {
    return { ok: true };
  }

  @Get('ip')
  @UseGuards(EmailThrottlerGuard)
  @Throttle({
    default: { limit: TEST_LIMIT, ttl: EMAIL_RATE_WINDOW_MS },
  })
  ip() {
    return { ok: true };
  }
}

/**
 * Exercises the guard through a real Nest app importing `EmailModule` — the
 * same wiring the invoice/feedback/contact controllers rely on, so a broken
 * dependency resolution here would fail there too.
 */
describe('EmailThrottlerGuard (integration)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EmailModule],
      controllers: [TestEmailController],
      providers: [StubTenantGuard],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lets requests through up to the daily limit, then returns 429', async () => {
    for (let i = 0; i < TEST_LIMIT; i += 1) {
      await request(app.getHttpServer())
        .get('/test-email/tenant')
        .set('x-test-tenant', 'tenant-1')
        .expect(200);
    }

    const blocked = await request(app.getHttpServer())
      .get('/test-email/tenant')
      .set('x-test-tenant', 'tenant-1')
      .expect(429);

    const body = blocked.body as { message?: string };
    expect(body.message).toBe(
      'Daily email limit reached. Please try again tomorrow.',
    );
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('buckets each tenant separately', async () => {
    for (let i = 0; i < TEST_LIMIT + 1; i += 1) {
      await request(app.getHttpServer())
        .get('/test-email/tenant')
        .set('x-test-tenant', 'tenant-1');
    }

    // tenant-1 is exhausted, tenant-2 is untouched.
    await request(app.getHttpServer())
      .get('/test-email/tenant')
      .set('x-test-tenant', 'tenant-1')
      .expect(429);

    await request(app.getHttpServer())
      .get('/test-email/tenant')
      .set('x-test-tenant', 'tenant-2')
      .expect(200);
  });

  it('buckets anonymous requests by client IP', async () => {
    for (let i = 0; i < TEST_LIMIT; i += 1) {
      await request(app.getHttpServer()).get('/test-email/ip').expect(200);
    }

    await request(app.getHttpServer()).get('/test-email/ip').expect(429);
  });
});
