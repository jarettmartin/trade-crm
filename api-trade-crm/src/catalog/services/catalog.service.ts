import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { CatalogItem } from '../entities/catalog-item.entity';
import { CreateCatalogItemDto } from '../dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from '../dto/update-catalog-item.dto';

/**
 * Cap on free-text search tokens. Bounds the work a pathological `q` (a
 * thousands-of-words string) can create; far above any realistic search.
 */
const MAX_SEARCH_TOKENS = 12;

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(CatalogItem)
    private readonly catalogItemRepository: Repository<CatalogItem>,
  ) {}

  async create(dto: CreateCatalogItemDto, tenantId: string) {
    const item = this.catalogItemRepository.create({
      ...dto,
      tenantId,
    });
    const saved = await this.catalogItemRepository.save(item);
    this.logger.log(`Catalog item ${saved.id} created for tenant ${tenantId}`);
    return saved;
  }

  async findAll(
    tenantId: string,
    page: number,
    limit: number,
    type?: string,
    q?: string,
  ) {
    const skip = (page - 1) * limit;

    const query = this.catalogItemRepository.createQueryBuilder('item');
    query.where('item.tenantId = :tenantId', { tenantId });

    if (type) {
      const types = type
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      if (types.length > 0) {
        query.andWhere('item.type IN (:...types)', { types });
      }
    }

    // Free-text search: every whitespace-separated token must match at least one
    // field — AND across tokens, OR across fields — the same shape as
    // CustomerService.search. So "snow plow" finds "Snow plowing — parking lot"
    // and the words may appear in any order or in different fields (previously
    // the whole string had to appear verbatim in a single field). Tokens are
    // always bound as parameters, never interpolated into the SQL.
    const tokens = (q ?? '')
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, MAX_SEARCH_TOKENS);

    tokens.forEach((token, index) => {
      const param = `token_${index}`;
      const like = `%${token}%`;

      query.andWhere(
        new Brackets((qb) => {
          // Columns are written in their physical, quoted form on purpose: raw
          // SQL fragments bypass TypeORM's property→column mapping, and the
          // mapping is also skipped when an `alias.property` is immediately
          // followed by a `::` cast. Unquoted, Postgres folds `unitPrice` to
          // `unitprice` and the query fails with "column item.unitprice does
          // not exist".
          qb.where(`LOWER(item."description") LIKE LOWER(:${param})`, {
            [param]: like,
          })
            .orWhere(`LOWER(item."type"::text) LIKE LOWER(:${param})`, {
              [param]: like,
            })
            .orWhere(`LOWER(item."unitPrice"::text) LIKE LOWER(:${param})`, {
              [param]: like,
            });
        }),
      );
    });

    query.orderBy('item.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const item = await this.catalogItemRepository.findOne({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    return item;
  }

  async update(id: string, dto: UpdateCatalogItemDto, tenantId: string) {
    const item = await this.catalogItemRepository.findOne({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    Object.assign(item, dto);
    const saved = await this.catalogItemRepository.save(item);

    this.logger.log(`Catalog item ${saved.id} updated for tenant ${tenantId}`);

    return saved;
  }

  async delete(id: string, tenantId: string) {
    const item = await this.catalogItemRepository.findOne({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    // Existing job line items keep their snapshotted values — the FK uses
    // ON DELETE SET NULL, so only the catalogItemId reference is cleared.
    await this.catalogItemRepository.delete({ id, tenantId });

    this.logger.log(`Catalog item ${id} deleted for tenant ${tenantId}`);

    return { success: true };
  }
}
