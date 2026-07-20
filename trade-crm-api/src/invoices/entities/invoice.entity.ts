import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Job } from '../../jobs/entities/job.entity';

@Entity('invoices')
export class Invoice extends TenantScopedEntity {
  @Column({ type: 'uuid' })
  jobId!: string;

  @Column({ type: 'int' })
  invoiceNumber!: number;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  taxPercent!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ type: 'timestamptz', nullable: true })
  issuedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ type: 'jsonb' })
  snapshot!: object;

  @ManyToOne(() => Tenant, (tenant) => tenant.invoices)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => Job, (job) => job.invoices)
  @JoinColumn({ name: 'jobId' })
  job!: Job;
}
