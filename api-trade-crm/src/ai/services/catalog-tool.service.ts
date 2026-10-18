import { Injectable } from '@nestjs/common';
import { CatalogItem } from '../../catalog/entities/catalog-item.entity';
import { CatalogService } from '../../catalog/services/catalog.service';
import { AI_MAX_TOOL_RESULTS } from '../ai-estimator.config';

/**
 * A catalog row as the model sees it: the minimum needed to judge a match.
 * Prices are included for matching/reasoning only — they are never treated as
 * authoritative (the confirmation path re-reads them from the database).
 */
export interface CatalogToolItem {
  id: string;
  type: string;
  description: string;
  unitPrice: number;
}

/** A bounded read of the tenant's catalog, plus the untruncated row count. */
export interface CatalogSnapshot {
  items: CatalogToolItem[];
  total: number;
}

/**
 * The tenant-scoped catalog reads the model is allowed to perform: the
 * `search_catalog` tool (large catalogs) and the inline snapshot (the default
 * fast path).
 *
 * It deliberately reuses the existing catalog search (`CatalogService.findAll`,
 * the same query the Manage Catalog page uses) so there is one search
 * implementation, and every query is scoped to the caller's `tenantId` — the
 * model can never reach another tenant's catalog.
 */
@Injectable()
export class CatalogToolService {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Search the caller's catalog and return a compact, capped result set.
   * An empty/blank query returns the most recent items (still capped) rather
   * than dumping the whole catalog into the prompt.
   */
  async search(tenantId: string, query: string): Promise<CatalogToolItem[]> {
    const { data } = await this.catalogService.findAll(
      tenantId,
      1,
      AI_MAX_TOOL_RESULTS,
      undefined,
      query.trim() || undefined,
    );

    return data.map((item) => this.toToolItem(item));
  }

  /**
   * A bounded snapshot of the caller's catalog for the inline fast path.
   * `total` is the full row count, so the caller can tell whether the snapshot
   * is complete (inline) or truncated (fall back to the search tool).
   */
  async snapshot(tenantId: string, limit: number): Promise<CatalogSnapshot> {
    const { data, meta } = await this.catalogService.findAll(
      tenantId,
      1,
      limit,
    );

    return {
      items: data.map((item) => this.toToolItem(item)),
      total: meta.total,
    };
  }

  private toToolItem(item: CatalogItem): CatalogToolItem {
    return {
      id: item.id,
      type: item.type,
      description: item.description,
      unitPrice: Number(item.unitPrice),
    };
  }
}
