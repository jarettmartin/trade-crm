import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { JobLineItemType } from '../../common/enums/job-line-item-type.enum';
import { Job } from './job.entity';
import { CatalogItem } from '../../catalog/entities/catalog-item.entity';

@Entity('job_line_items')
export class JobLineItem extends TenantScopedEntity {
  @Column({ type: 'uuid' })
  jobId!: string;

  @Column({ type: 'enum', enum: JobLineItemType })
  type!: JobLineItemType;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  lineTotal!: number;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  /**
   * Optional reference to the catalog item this line item was created from.
   * All display values (type/description/unitPrice/…) are always snapshotted
   * onto this row — editing or deleting the referenced catalog item never
   * changes an existing line item (FK is ON DELETE SET NULL).
   */
  @Column({ type: 'uuid', nullable: true })
  catalogItemId?: string;

  @ManyToOne(() => CatalogItem, (catalogItem) => catalogItem.lineItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'catalogItemId' })
  catalogItem?: CatalogItem;

  @ManyToOne(() => Job, (job) => job.lineItems)
  @JoinColumn({ name: 'jobId' })
  job!: Job;
}
