import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AiEstimatorService } from './ai-estimator.service';
import type { CatalogMatcherService } from './catalog-matcher.service';
import type { AiUsage, AiUsageService } from './ai-usage.service';
import { AiNotConfiguredError } from '../anthropic.client';

const MATCH_RESULT = {
  suggestions: [
    {
      catalogItemId: 'cat-leaf',
      type: 'SERVICE',
      description: 'Leaf removal and disposal',
      unitPrice: 75,
      quantity: 1,
    },
  ],
  followUpQuestions: [],
};

const RESET_AT = '2026-10-13T23:00:00.000Z';

function usage(overrides: Partial<AiUsage> = {}): AiUsage {
  return {
    limit: 3,
    used: 1,
    remaining: 2,
    resetAt: RESET_AT,
    ...overrides,
  };
}

function createService() {
  const matcher = {
    match:
      jest.fn<(tenantId: string, description: string) => Promise<unknown>>(),
  };
  const usageService = {
    consume: jest.fn<(userId: string, tenantId: string) => Promise<unknown>>(),
    getUsage: jest.fn<(userId: string) => Promise<AiUsage>>(),
  };

  const service = new AiEstimatorService(
    matcher as unknown as CatalogMatcherService,
    usageService as unknown as AiUsageService,
  );

  return { matcher, usageService, service };
}

describe('AiEstimatorService.estimate', () => {
  let matcher: ReturnType<typeof createService>['matcher'];
  let usageService: ReturnType<typeof createService>['usageService'];
  let service: AiEstimatorService;

  beforeEach(() => {
    ({ matcher, usageService, service } = createService());
  });

  it('returns suggestions plus a public usage block (no internal flag)', async () => {
    usageService.consume.mockResolvedValue({ allowed: true, ...usage() });
    matcher.match.mockResolvedValue(MATCH_RESULT);

    const result = await service.estimate('clear leaves', 'user-1', 'tenant-1');

    expect(matcher.match).toHaveBeenCalledWith('tenant-1', 'clear leaves');
    expect(result.suggestions).toHaveLength(1);
    expect(result.usage).toEqual(usage());
    expect(result.usage).not.toHaveProperty('allowed');
  });

  it('consumes the budget before calling the provider', async () => {
    usageService.consume.mockResolvedValue({ allowed: true, ...usage() });
    matcher.match.mockResolvedValue(MATCH_RESULT);

    await service.estimate('clear leaves', 'user-1', 'tenant-1');

    const consumeOrder = usageService.consume.mock.invocationCallOrder[0];
    const matchOrder = matcher.match.mock.invocationCallOrder[0];
    expect(consumeOrder).toBeLessThan(matchOrder);
  });

  it('returns 429 with a retry hint when the budget is exhausted', async () => {
    usageService.consume.mockResolvedValue({
      allowed: false,
      ...usage({ used: 3, remaining: 0 }),
    });

    const error = await service
      .estimate('clear leaves', 'user-1', 'tenant-1')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(HttpException);
    const httpError = error as HttpException;
    expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    const body = httpError.getResponse() as {
      message: string;
      retryAfterSeconds: number;
    };
    expect(body.message).toContain('limit reached');
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    // No paid call is made when the limit is hit.
    expect(matcher.match).not.toHaveBeenCalled();
  });

  it('maps a missing API key to 503', async () => {
    usageService.consume.mockResolvedValue({ allowed: true, ...usage() });
    matcher.match.mockRejectedValue(new AiNotConfiguredError());

    const error = (await service
      .estimate('clear leaves', 'user-1', 'tenant-1')
      .catch((err: unknown) => err)) as HttpException;

    expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('maps a provider error to a safe 502', async () => {
    usageService.consume.mockResolvedValue({ allowed: true, ...usage() });
    matcher.match.mockRejectedValue(new Error('Request timed out'));

    const error = (await service
      .estimate('clear leaves', 'user-1', 'tenant-1')
      .catch((err: unknown) => err)) as HttpException;

    expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    // The provider's internals are not echoed to the client.
    expect(JSON.stringify(error.getResponse())).not.toContain('timed out');
  });
});

describe('AiEstimatorService.getUsage', () => {
  it('delegates to the usage service', async () => {
    const { usageService, service } = createService();
    usageService.getUsage.mockResolvedValue(usage());

    await expect(service.getUsage('user-1')).resolves.toEqual(usage());
    expect(usageService.getUsage).toHaveBeenCalledWith('user-1');
  });
});
