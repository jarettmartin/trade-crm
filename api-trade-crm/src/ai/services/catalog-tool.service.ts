import { Injectable } from '@nestjs/common';
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

/**
 * The tenant-scoped read the model is allowed to perform through the
 * `search_catalog` tool.
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

    return data.map((item) => ({
      id: item.id,
      type: item.type,
      description: item.description,
      unitPrice: Number(item.unitPrice),
    }));
  }
}
