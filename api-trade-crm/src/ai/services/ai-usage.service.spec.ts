import { beforeEach, describe, expect, it } from '@jest/globals';
import type { DataSource } from 'typeorm';
import { AiUsageService } from './ai-usage.service';
import {
  AI_RATE_LIMIT_PER_USER_PER_HOUR,
  AI_RATE_WINDOW_MS,
} from '../ai-estimator.config';

interface FakeRow {
  userId: string;
  tenantId: string;
  createdAt: Date;
}

/** Mirrors the `MoreThan(...)` condition the service builds for its window. */
interface FakeWhere {
  userId: string;
  createdAt: { value: Date };
}

interface FakeFindOptions {
  where: FakeWhere;
  order?: { createdAt: 'ASC' | 'DESC' };
  select?: { createdAt: true };
}

/**
 * Minimal stand-in for the slice of `EntityManager` the service uses, plus the
 * one raw statement it is allowed to issue (the per-user advisory lock). Any
 * other raw SQL throws, so a regression back to hand-written queries fails the
 * suite instead of passing silently.
 */
class FakeEntityManager {
  /** Raw SQL the service actually issued — asserted to be the lock only. */
  readonly rawQueries: string[] = [];

  constructor(private readonly rows: FakeRow[]) {}

  query(sql: string): unknown[] {
    if (!sql.includes('pg_advisory_xact_lock')) {
      throw new Error(`Unexpected raw query in AiUsageService: ${sql}`);
    }
    this.rawQueries.push(sql);
    return [];
  }

  count(_entity: unknown, options: FakeFindOptions): number {
    return this.matching(options.where).length;
  }

  findOne(_entity: unknown, options: FakeFindOptions): FakeRow | null {
    const oldest = this.matching(options.where).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )[0];

    return oldest ?? null;
  }

  create(
    _entity: unknown,
    values: { userId: string; tenantId: string },
  ): FakeRow {
    return { ...values, createdAt: new Date() };
  }

  save(_entity: unknown, row: FakeRow): FakeRow {
    this.rows.push(row);
    return row;
  }

  private matching(where: FakeWhere): FakeRow[] {
    return this.rows.filter(
      (row) =>
        row.userId === where.userId &&
        row.createdAt.getTime() > where.createdAt.value.getTime(),
    );
  }
}

/** A stand-in `DataSource`/transaction host over the same `rows` array. */
class FakeDataSource {
  readonly rows: FakeRow[] = [];
  readonly manager = new FakeEntityManager(this.rows);

  /** Pre-seed a request at a given age (ms before now). */
  seed(userId: string, ageMs: number): void {
    this.rows.push({
      userId,
      tenantId: 'tenant-1',
      createdAt: new Date(Date.now() - ageMs),
    });
  }

  transaction<T>(
    callback: (manager: FakeEntityManager) => Promise<T>,
  ): Promise<T> {
    return callback(this.manager);
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

  it('issues no raw SQL other than the per-user advisory lock', async () => {
    await service.consume('user-1', 'tenant-1');
    await service.getUsage('user-1');

    // Every read/write goes through the repository API; the lock is the one
    // statement that has no ORM equivalent.
    expect(dataSource.manager.rawQueries).toEqual([
      'SELECT pg_advisory_xact_lock(hashtext($1))',
    ]);
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
