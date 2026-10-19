import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { Brackets } from 'typeorm';
import { CatalogService } from './catalog.service';
import { CatalogItem } from '../entities/catalog-item.entity';
import { CatalogItemType } from '../../common/enums/catalog-item-type.enum';

interface RecordedFragment {
  sql: string;
  params?: Record<string, unknown>;
}

/**
 * Records the raw fragments the service adds inside a `Brackets` group — i.e.
 * the per-token search conditions.
 */
class RecordingWhere {
  readonly calls: RecordedFragment[] = [];

  where(sql: string, params?: Record<string, unknown>): this {
    this.calls.push({ sql, params });
    return this;
  }

  orWhere(sql: string, params?: Record<string, unknown>): this {
    this.calls.push({ sql, params });
    return this;
  }
}

interface RecordedCondition {
  condition: unknown;
  params?: Record<string, unknown>;
}

/** Captures what the service asks the query builder to do. */
class FakeQueryBuilder {
  readonly whereCalls: RecordedCondition[] = [];
  readonly andWhereCalls: RecordedCondition[] = [];
  readonly orderByCalls: Array<[string, string]> = [];
  skipValue: number | null = null;
  takeValue: number | null = null;
  getManyAndCountCalls = 0;

  constructor(
    private readonly rows: unknown[] = [],
    private readonly total = 0,
  ) {}

  where(condition: unknown, params?: Record<string, unknown>): this {
    this.whereCalls.push({ condition, params });
    return this;
  }

  andWhere(condition: unknown, params?: Record<string, unknown>): this {
    this.andWhereCalls.push({ condition, params });
    return this;
  }

  orderBy(column: string, direction: string): this {
    this.orderByCalls.push([column, direction]);
    return this;
  }

  skip(value: number): this {
    this.skipValue = value;
    return this;
  }

  take(value: number): this {
    this.takeValue = value;
    return this;
  }

  getManyAndCount(): Promise<[unknown[], number]> {
    this.getManyAndCountCalls += 1;
    return Promise.resolve([this.rows, this.total]);
  }
}

function createService(total = 0) {
  const queryBuilder = new FakeQueryBuilder([], total);
  const repository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
    findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    create: jest.fn((entity: unknown) => entity),
    save: jest.fn<(...args: unknown[]) => Promise<unknown>>((entity) =>
      Promise.resolve(entity),
    ),
    delete: jest.fn<(...args: unknown[]) => Promise<{ affected?: number }>>(),
  };
  const service = new CatalogService(
    repository as unknown as Repository<CatalogItem>,
  );

  return { repository, queryBuilder, service };
}

/** Runs a `Brackets` group's factory against a recorder to read its fragments. */
function fragmentsOf(condition: unknown): RecordedFragment[] {
  const recorder = new RecordingWhere();
  (condition as Brackets).whereFactory(recorder as never);
  return recorder.calls;
}

/** The per-token search groups the service added (the `Brackets` conditions). */
function searchGroups(queryBuilder: FakeQueryBuilder): RecordedFragment[][] {
  return queryBuilder.andWhereCalls
    .filter((call) => call.condition instanceof Brackets)
    .map((call) => fragmentsOf(call.condition));
}

describe('CatalogService.findAll — search', () => {
  let queryBuilder: FakeQueryBuilder;
  let service: CatalogService;

  beforeEach(() => {
    ({ queryBuilder, service } = createService());
  });

  it('adds no search condition when q is absent or blank', async () => {
    await service.findAll('tenant-1', 1, 10);
    expect(searchGroups(queryBuilder)).toHaveLength(0);

    await service.findAll('tenant-1', 1, 10, undefined, '   ');
    expect(searchGroups(queryBuilder)).toHaveLength(0);
  });

  it('matches a single token across description, type and price', async () => {
    await service.findAll('tenant-1', 1, 10, undefined, 'leaf');

    const groups = searchGroups(queryBuilder);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((fragment) => fragment.sql)).toEqual([
      'LOWER(item."description") LIKE LOWER(:token_0)',
      'LOWER(item."type"::text) LIKE LOWER(:token_0)',
      'LOWER(item."unitPrice"::text) LIKE LOWER(:token_0)',
    ]);
    expect(groups[0].map((fragment) => fragment.params)).toEqual([
      { token_0: '%leaf%' },
      { token_0: '%leaf%' },
      { token_0: '%leaf%' },
    ]);
  });

  it('requires every token (AND), each with its own parameter', async () => {
    // Previously the whole string had to appear verbatim in one field, so
    // "snow plow" missed "Snow plowing — parking lot".
    await service.findAll('tenant-1', 1, 10, undefined, 'snow   plow');

    const groups = searchGroups(queryBuilder);
    expect(groups).toHaveLength(2);
    expect(groups[0][0].params).toEqual({ token_0: '%snow%' });
    expect(groups[1][0].params).toEqual({ token_1: '%plow%' });
  });

  it('binds tokens as parameters, never as literal SQL', async () => {
    await service.findAll('tenant-1', 1, 10, undefined, "o'brien");

    const groups = searchGroups(queryBuilder);
    expect(groups).toHaveLength(1);
    expect(groups[0][0].params).toEqual({ token_0: "%o'brien%" });

    const sql = groups
      .flat()
      .map((fragment) => fragment.sql)
      .join(' ');
    expect(sql).not.toContain("o'brien");
  });

  it('caps the number of tokens', async () => {
    const words = Array.from({ length: 40 }, (_, index) => `w${index}`);

    await service.findAll('tenant-1', 1, 10, undefined, words.join(' '));

    expect(searchGroups(queryBuilder)).toHaveLength(12);
  });

  it('quotes the physical columns so the ::text casts resolve', async () => {
    await service.findAll('tenant-1', 1, 10, undefined, 'light');

    const sql = searchGroups(queryBuilder)
      .flat()
      .map((fragment) => fragment.sql)
      .join(' ');

    expect(sql).toContain('item."unitPrice"::text');
    expect(sql).toContain('item."type"::text');
    // No unquoted camelCase left behind (Postgres would fold it to lowercase).
    expect(sql).not.toMatch(/item\.unitPrice/);
    expect(sql).not.toMatch(/item\.type/);
  });
});

describe('CatalogService — shared behaviour unchanged', () => {
  it('scopes findAll to the tenant and keeps ordering + pagination', async () => {
    const { queryBuilder, service } = createService(7);

    const result = await service.findAll('tenant-1', 3, 5);

    expect(queryBuilder.whereCalls[0]).toEqual({
      condition: 'item.tenantId = :tenantId',
      params: { tenantId: 'tenant-1' },
    });
    expect(queryBuilder.orderByCalls).toEqual([['item.createdAt', 'DESC']]);
    expect(queryBuilder.skipValue).toBe(10);
    expect(queryBuilder.takeValue).toBe(5);
    expect(queryBuilder.getManyAndCountCalls).toBe(1);
    expect(result.meta).toEqual({ page: 3, limit: 5, total: 7, totalPages: 2 });
  });

  it('still applies the type filter, independent of the search', async () => {
    const { queryBuilder, service } = createService();

    await service.findAll('tenant-1', 1, 10, 'SERVICE, FEE, ');

    const typeCall = queryBuilder.andWhereCalls.find(
      (call) => call.condition === 'item.type IN (:...types)',
    );
    expect(typeCall?.params).toEqual({ types: ['SERVICE', 'FEE'] });
    expect(searchGroups(queryBuilder)).toHaveLength(0);
  });

  it('ignores a blank type list instead of matching nothing', async () => {
    const { queryBuilder, service } = createService();

    await service.findAll('tenant-1', 1, 10, ' , ');

    expect(
      queryBuilder.andWhereCalls.some(
        (call) => call.condition === 'item.type IN (:...types)',
      ),
    ).toBe(false);
  });

  it('keeps findById / update / delete tenant-scoped', async () => {
    const { repository, service } = createService();
    repository.findOne.mockResolvedValue({ id: 'c1', tenantId: 'tenant-1' });

    await service.findById('c1', 'tenant-1');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'c1', tenantId: 'tenant-1' },
    });

    await service.update('c1', { unitPrice: 10 }, 'tenant-1');
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c1',
        tenantId: 'tenant-1',
        unitPrice: 10,
      }),
    );

    repository.delete.mockResolvedValue({ affected: 1 });
    await expect(service.delete('c1', 'tenant-1')).resolves.toEqual({
      success: true,
    });
    expect(repository.delete).toHaveBeenCalledWith({
      id: 'c1',
      tenantId: 'tenant-1',
    });
  });

  it('stamps the caller tenant on create', async () => {
    const { repository, service } = createService();

    await service.create(
      {
        description: 'Leaf removal',
        type: CatalogItemType.SERVICE,
        unitPrice: 75,
      },
      'tenant-1',
    );

    expect(repository.create).toHaveBeenCalledWith({
      description: 'Leaf removal',
      type: 'SERVICE',
      unitPrice: 75,
      tenantId: 'tenant-1',
    });
  });
});
