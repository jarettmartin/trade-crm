import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, MoreThan } from 'typeorm';
import { AiEstimationRequest } from '../entities/ai-estimation-request.entity';
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

/** One read of the rolling window: how many requests, and the oldest one. */
interface WindowRead {
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
 * user can never both read "2 used" and both slip past the cap. That lock is the
 * only raw SQL in this service — a Postgres advisory lock has no ORM equivalent.
 * Every read and write goes through the repository API (same style as
 * `CustomerService`), so the entity owns the column names and `createdAt` is
 * stamped by `@CreateDateColumn`.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Current usage for a user, without consuming anything. */
  async getUsage(userId: string): Promise<AiUsage> {
    const { used, oldest } = await this.readWindow(
      this.dataSource.manager,
      userId,
    );

    return this.toUsage(used, oldest);
  }

  /**
   * Atomically checks the budget and, if a slot is free, records the request.
   * Callers must call this *before* the provider call and abort on `!allowed`.
   */
  async consume(userId: string, tenantId: string): Promise<AiUsageDecision> {
    return this.dataSource.transaction(async (manager) => {
      // Serialize all budget checks for this user for the rest of the txn.
      // Raw SQL on purpose: a Postgres advisory lock has no ORM equivalent.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        userId,
      ]);

      const { used, oldest } = await this.readWindow(manager, userId);

      if (used >= AI_RATE_LIMIT_PER_USER_PER_HOUR) {
        return { allowed: false, ...this.toUsage(used, oldest) };
      }

      const request = manager.create(AiEstimationRequest, {
        userId,
        tenantId,
      });
      await manager.save(AiEstimationRequest, request);

      this.logger.log(`AI estimation request accepted for user ${userId}`);

      // `used + 1`: this request is now recorded, so it counts as consumed.
      return { allowed: true, ...this.toUsage(used + 1, oldest) };
    });
  }

  /**
   * Reads the caller's rolling window: how many requests fall inside it, and
   * when the oldest of those was made (used to report when a slot frees up).
   */
  private async readWindow(
    manager: EntityManager,
    userId: string,
  ): Promise<WindowRead> {
    const where = {
      userId,
      createdAt: MoreThan(this.windowStart()),
    };

    const used = await manager.count(AiEstimationRequest, { where });
    const oldestRow = await manager.findOne(AiEstimationRequest, {
      where,
      order: { createdAt: 'ASC' },
      select: { createdAt: true },
    });

    return { used, oldest: oldestRow?.createdAt ?? null };
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
