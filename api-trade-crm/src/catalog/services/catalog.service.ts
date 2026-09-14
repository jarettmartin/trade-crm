import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { CatalogItem } from '../entities/catalog-item.entity';
import { CreateCatalogItemDto } from '../dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from '../dto/update-catalog-item.dto';

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

    const trimmed = q?.trim();
    if (trimmed) {
      const like = `%${trimmed}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(item.description) LIKE LOWER(:search)', {
            search: like,
          })
            .orWhere('LOWER(item.type::text) LIKE LOWER(:search)', {
              search: like,
            })
            .orWhere('LOWER(item.unitPrice::text) LIKE LOWER(:search)', {
              search: like,
            });
        }),
      );
    }

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
