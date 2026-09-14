import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { CatalogItemType } from '../../common/enums/catalog-item-type.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { JobLineItem } from '../../jobs/entities/job-line-item.entity';

/**
 * A reusable preset line item a tenant can pick from when adding line items
 * to a job. Values are always snapshotted into the job_line_items row at the
 * time the line item is applied, so editing or deleting a catalog item never
 * changes existing line items (see JobLineItem.catalogItemId).
 */
@Entity('catalog_items')
export class CatalogItem extends TenantScopedEntity {
  @Column({
    type: 'enum',
    enum: CatalogItemType,
    enumName: 'catalog_items_type_enum',
  })
  type!: CatalogItemType;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.catalogItems)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @OneToMany(() => JobLineItem, (lineItem) => lineItem.catalogItem)
  lineItems?: JobLineItem[];
}
