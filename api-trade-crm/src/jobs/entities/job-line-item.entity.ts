import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { JobLineItemType } from '../../common/enums/job-line-item-type.enum';
import { Job } from './job.entity';

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

  @ManyToOne(() => Job, (job) => job.lineItems)
  @JoinColumn({ name: 'jobId' })
  job!: Job;
}
