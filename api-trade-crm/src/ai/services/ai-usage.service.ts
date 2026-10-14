import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AI_RATE_LIMIT_PER_USER_PER_HOUR,
  AI_RATE_WINDOW_MS,
} from '../ai-estimator.config';

/** The caller's budget state, safe to return to the client. */
export interface AiUsage {
  /** Requests allowed per rolling hour. */
  limit: number;
  /** Requests used in the current window. */
  used: number;
  /** Requests still available right now. */
  remaining: number;
  /** ISO timestamp when the oldest counted request ages out. */
  resetAt: string;
}

/** `consume`'s answer: usage plus whether this request may proceed. */
export interface AiUsageDecision extends AiUsage {
  allowed: boolean;
}

interface UsageRow {
  used: number;
  oldest: Date | null;
}

/**
 * Persistent, atomic enforcement of the per-user AI budget (3 per rolling
 * hour).
 *
 * A request is recorded *before* the paid provider call, so a provider failure
 * still consumes the budget — failures cannot be used to bypass the cost cap.
 * Counting lives in Postgres rather than memory (the email throttler is
 * in-memory and resets on deploy) so the limit survives restarts and is shared
 * if the API ever runs more than one instance.
 *
 * Concurrency: the count-then-insert runs inside a transaction guarded by a
 * per-user `pg_advisory_xact_lock`, so two simultaneous requests for the same
 * user can never both read "2 used" and both slip past the cap.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Current usage for a user, without consuming anything. */
  async getUsage(userId: string): Promise<AiUsage> {
    const rows = await this.dataSource.query<UsageRow[]>(
      `SELECT COUNT(*)::int AS used, MIN("createdAt") AS oldest
         FROM ai_estimation_requests
        WHERE "userId" = $1 AND "createdAt" > $2`,
      [userId, this.windowStart()],
    );

    return this.toUsage(rows[0]?.used ?? 0, rows[0]?.oldest ?? null);
  }

  /**
   * Atomically checks the budget and, if a slot is free, records the request.
   * Callers must call this *before* the provider call and abort on `!allowed`.
   */
  async consume(userId: string, tenantId: string): Promise<AiUsageDecision> {
    return this.dataSource.transaction(async (manager) => {
      // Serialize all budget checks for this user for the rest of the txn.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        userId,
      ]);

      const rows = await manager.query<UsageRow[]>(
        `SELECT COUNT(*)::int AS used, MIN("createdAt") AS oldest
           FROM ai_estimation_requests
          WHERE "userId" = $1 AND "createdAt" > $2`,
        [userId, this.windowStart()],
      );

      const used = rows[0]?.used ?? 0;
      const oldest = rows[0]?.oldest ?? null;

      if (used >= AI_RATE_LIMIT_PER_USER_PER_HOUR) {
        return { allowed: false, ...this.toUsage(used, oldest) };
      }

      await manager.query(
        `INSERT INTO ai_estimation_requests ("userId", "tenantId") VALUES ($1, $2)`,
        [userId, tenantId],
      );

      this.logger.log(`AI estimation request accepted for user ${userId}`);

      // `used + 1`: this request is now recorded, so it counts as consumed.
      return { allowed: true, ...this.toUsage(used + 1, oldest) };
    });
  }

  private windowStart(): Date {
    return new Date(Date.now() - AI_RATE_WINDOW_MS);
  }

  private toUsage(used: number, oldest: Date | null): AiUsage {
    const now = Date.now();
    const oldestMs = oldest ? oldest.getTime() : now;
    const resetAt = Math.max(oldestMs + AI_RATE_WINDOW_MS, now);

    return {
      limit: AI_RATE_LIMIT_PER_USER_PER_HOUR,
      used,
      remaining: Math.max(0, AI_RATE_LIMIT_PER_USER_PER_HOUR - used),
      resetAt: new Date(resetAt).toISOString(),
    };
  }
}
