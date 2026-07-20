import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { JobStatus } from '../../common/enums/job-status.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerAddress } from '../../customers/entities/customer-address.entity';
import { User } from '../../users/entities/user.entity';
import { JobNote } from './job-note.entity';
import { JobLineItem } from './job-line-item.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Entity('jobs')
export class Job extends TenantScopedEntity {
  @Column({ type: 'uuid' })
  customerId!: string;

  @Column({ type: 'uuid' })
  customerAddressId!: string;

  @Column({ type: 'uuid', nullable: true })
  assignedUserId?: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
  status!: JobStatus;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledStart?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledEnd?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.jobs)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => Customer, (customer) => customer.jobs)
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @ManyToOne(() => CustomerAddress)
  @JoinColumn({ name: 'customerAddressId' })
  customerAddress!: CustomerAddress;

  @ManyToOne(() => User, (user) => user.assignedJobs, { nullable: true })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser?: User;

  @OneToMany(() => JobNote, (jobNote) => jobNote.job)
  notes!: JobNote[];

  @OneToMany(() => JobLineItem, (lineItem) => lineItem.job)
  lineItems!: JobLineItem[];

  @OneToMany(() => Invoice, (invoice) => invoice.job)
  invoices!: Invoice[];
}
