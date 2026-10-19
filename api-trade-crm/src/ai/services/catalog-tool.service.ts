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

/**
 * The tenant-scoped catalog read the model performs through the
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
   * Search the caller's catalog and return a compact result set.
   *
   * A blank query means "no filter", which returns the caller's whole catalog
   * (newest first, capped at AI_MAX_TOOL_RESULTS) — that is how the model asks
   * to see everything when the catalog is small. A non-blank query is the
   * existing token search (AND across tokens, OR across fields).
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

  private toToolItem(item: CatalogItem): CatalogToolItem {
    return {
      id: item.id,
      type: item.type,
      description: item.description,
      unitPrice: Number(item.unitPrice),
    };
  }
}
