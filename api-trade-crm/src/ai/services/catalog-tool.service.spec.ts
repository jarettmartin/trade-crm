import { describe, expect, it, jest } from '@jest/globals';
import { CatalogItem } from '../../catalog/entities/catalog-item.entity';
import { CatalogService } from '../../catalog/services/catalog.service';
import { AI_MAX_TOOL_RESULTS } from '../ai-estimator.config';
import { CatalogToolService } from './catalog-tool.service';

/** A row as TypeORM/pg hands it back — decimals arrive as strings. */
function catalogItem(overrides: Record<string, unknown> = {}): CatalogItem {
  const item = new CatalogItem();
  Object.assign(item, {
    id: 'cat-1',
    tenantId: 'tenant-1',
    type: 'SERVICE',
    description: 'Leaf removal',
    unitPrice: '75.00',
    ...overrides,
  });
  return item;
}

function createService() {
  const findAll =
    jest.fn<
      (
        tenantId: string,
        page: number,
        limit: number,
        type?: string,
        q?: string,
      ) => Promise<{ data: CatalogItem[]; meta: Record<string, number> }>
    >();
  const catalogService = { findAll } as unknown as CatalogService;

  return { findAll, service: new CatalogToolService(catalogService) };
}

describe('CatalogToolService.search', () => {
  it('reads the caller tenant, caps results, and maps to compact items', async () => {
    const { findAll, service } = createService();
    findAll.mockResolvedValue({
      data: [catalogItem()],
      meta: { page: 1, limit: AI_MAX_TOOL_RESULTS, total: 1, totalPages: 1 },
    });

    const items = await service.search('tenant-1', '  leaf  ');

    expect(findAll).toHaveBeenCalledWith(
      'tenant-1',
      1,
      AI_MAX_TOOL_RESULTS,
      undefined,
      'leaf',
    );
    // pg returns decimals as strings; the model gets a number.
    expect(items).toEqual([
      {
        id: 'cat-1',
        type: 'SERVICE',
        description: 'Leaf removal',
        unitPrice: 75,
      },
    ]);
  });

  it('treats a blank query as no filter', async () => {
    const { findAll, service } = createService();
    findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

    await service.search('tenant-1', '   ');

    expect(findAll).toHaveBeenCalledWith(
      'tenant-1',
      1,
      AI_MAX_TOOL_RESULTS,
      undefined,
      undefined,
    );
  });
});

describe('CatalogToolService.snapshot', () => {
  it('returns the rows plus the untruncated total for the inline decision', async () => {
    const { findAll, service } = createService();
    findAll.mockResolvedValue({
      data: [
        catalogItem(),
        catalogItem({ id: 'cat-2', description: 'Garden soil and mulch' }),
      ],
      meta: { page: 1, limit: 2, total: 16, totalPages: 8 },
    });

    const snapshot = await service.snapshot('tenant-1', 2);

    expect(findAll).toHaveBeenCalledWith('tenant-1', 1, 2);
    expect(snapshot.total).toBe(16);
    expect(snapshot.items.map((item) => item.id)).toEqual(['cat-1', 'cat-2']);
  });
});
