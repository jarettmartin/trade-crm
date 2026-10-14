import { beforeEach, describe, expect, it } from '@jest/globals';
import type { DataSource } from 'typeorm';
import { AiUsageService } from './ai-usage.service';
import {
  AI_RATE_LIMIT_PER_USER_PER_HOUR,
  AI_RATE_WINDOW_MS,
} from '../ai-estimator.config';

interface FakeRow {
  userId: string;
  createdAt: Date;
}

/**
 * Minimal stand-in for Postgres: enough to exercise the count / insert /
 * advisory-lock statements the service issues, including rows that fall
 * outside the rolling window.
 */
class FakeDataSource {
  rows: FakeRow[] = [];

  /** Pre-seed a request at a given age (ms before now). */
  seed(userId: string, ageMs: number): void {
    this.rows.push({ userId, createdAt: new Date(Date.now() - ageMs) });
  }

  /** Runs the handful of statements the service issues against `rows`. */
  query(sql: string, params: unknown[] = []): unknown {
    if (sql.includes('pg_advisory_xact_lock')) {
      return [];
    }
    if (sql.trimStart().toUpperCase().startsWith('INSERT')) {
      this.rows.push({ userId: String(params[0]), createdAt: new Date() });
      return [];
    }

    const [userId, since] = params as [string, Date];
    const matching = this.rows.filter(
      (row) =>
        row.userId === userId && row.createdAt.getTime() > since.getTime(),
    );
    const used = matching.length;
    const oldest = used
      ? new Date(Math.min(...matching.map((row) => row.createdAt.getTime())))
      : null;

    return [{ used, oldest }];
  }

  transaction<T>(
    callback: (manager: FakeDataSource) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }
}

const LIMIT = AI_RATE_LIMIT_PER_USER_PER_HOUR;

function createService() {
  const dataSource = new FakeDataSource();
  const service = new AiUsageService(dataSource as unknown as DataSource);
  return { dataSource, service };
}

describe('AiUsageService.consume', () => {
  let dataSource: FakeDataSource;
  let service: AiUsageService;

  beforeEach(() => {
    ({ dataSource, service } = createService());
  });

  it(`allows ${LIMIT} requests and blocks the next one in the window`, async () => {
    for (let i = 0; i < LIMIT; i += 1) {
      const decision = await service.consume('user-1', 'tenant-1');
      expect(decision.allowed).toBe(true);
      expect(decision.remaining).toBe(LIMIT - (i + 1));
    }

    const blocked = await service.consume('user-1', 'tenant-1');

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.used).toBe(LIMIT);
    // The blocked request is not recorded, so the window doesn't extend.
    expect(dataSource.rows).toHaveLength(LIMIT);
  });

  it('keys the budget by user', async () => {
    for (let i = 0; i < LIMIT; i += 1) {
      await service.consume('user-1', 'tenant-1');
    }

    const otherUser = await service.consume('user-2', 'tenant-1');
    expect(otherUser.allowed).toBe(true);
  });

  it('ignores requests older than the rolling window', async () => {
    dataSource.seed('user-1', AI_RATE_WINDOW_MS + 1000);
    dataSource.seed('user-1', AI_RATE_WINDOW_MS + 2000);

    const decision = await service.consume('user-1', 'tenant-1');

    expect(decision.allowed).toBe(true);
    expect(decision.used).toBe(1);
  });

  it('reports a future reset time', async () => {
    const decision = await service.consume('user-1', 'tenant-1');
    expect(new Date(decision.resetAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('AiUsageService.getUsage', () => {
  it('reports current usage without consuming', async () => {
    const { dataSource, service } = createService();
    dataSource.seed('user-1', 1000);

    const usage = await service.getUsage('user-1');

    expect(usage).toMatchObject({
      limit: LIMIT,
      used: 1,
      remaining: LIMIT - 1,
    });
    expect(dataSource.rows).toHaveLength(1);
  });

  it('reports a full budget once the limit is reached', async () => {
    const { service } = createService();
    for (let i = 0; i < LIMIT; i += 1) {
      await service.consume('user-1', 'tenant-1');
    }

    const usage = await service.getUsage('user-1');
    expect(usage).toMatchObject({ used: LIMIT, remaining: 0 });
  });
});
