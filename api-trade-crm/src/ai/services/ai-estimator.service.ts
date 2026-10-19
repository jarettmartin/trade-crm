import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  CatalogMatchResult,
  CatalogMatcherService,
  CatalogSuggestion,
} from './catalog-matcher.service';
import { AiUsage, AiUsageDecision, AiUsageService } from './ai-usage.service';
import { AiNotConfiguredError } from '../anthropic.client';
import { AI_RATE_LIMIT_PER_USER_PER_HOUR } from '../ai-estimator.config';

/** The estimator response: validated suggestions plus the caller's budget. */
export interface CatalogMatchResponse extends CatalogMatchResult {
  usage: AiUsage;
}

/**
 * Orchestrates one estimate: enforces the per-user budget, runs the matcher,
 * and maps failures to safe client errors.
 *
 * Order matters — the budget is consumed *before* the provider call so a
 * failed (but still billed/attempted) request counts, and no paid call is ever
 * made once the limit is hit.
 */
@Injectable()
export class AiEstimatorService {
  private readonly logger = new Logger(AiEstimatorService.name);

  constructor(
    private readonly matcher: CatalogMatcherService,
    private readonly usage: AiUsageService,
  ) {}

  async estimate(
    description: string,
    userId: string,
    tenantId: string,
  ): Promise<CatalogMatchResponse> {
    const decision = await this.usage.consume(userId, tenantId);

    if (!decision.allowed) {
      const usage = publicUsage(decision);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(usage.resetAt).getTime() - Date.now()) / 1000),
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `AI estimator limit reached (${AI_RATE_LIMIT_PER_USER_PER_HOUR} requests per hour). Please try again later.`,
          retryAfterSeconds,
          usage,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const startedAt = Date.now();

    try {
      const result = await this.matcher.match(tenantId, description);
      this.logger.log(
        `AI estimation finished in ${Date.now() - startedAt}ms (${result.suggestions.length} suggestion(s))`,
      );
      return { ...result, usage: publicUsage(decision) };
    } catch (error) {
      // Not configured: a clear, permanent-ish condition (no key deployed).
      if (error instanceof AiNotConfiguredError) {
        this.logger.warn('AI estimation refused: provider not configured');
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'The AI estimator is not available right now. You can add line items manually below.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Provider error / timeout / rate limit. Log operational metadata only —
      // never the description or the raw provider payload.
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `AI estimation failed after ${Date.now() - startedAt}ms: ${reason}`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message:
            'The AI estimator is temporarily unavailable. Please try again.',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Current budget for the caller, without consuming anything. */
  getUsage(userId: string): Promise<AiUsage> {
    return this.usage.getUsage(userId);
  }
}

/** Drops the internal `allowed` flag before the usage leaves the server. */
export function publicUsage(decision: AiUsageDecision): AiUsage {
  return {
    limit: decision.limit,
    used: decision.used,
    remaining: decision.remaining,
    resetAt: decision.resetAt,
  };
}

export type { CatalogSuggestion };
