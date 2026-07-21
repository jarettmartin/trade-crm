import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Job } from '../../jobs/entities/job.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  businessName!: string;

  @Column({ type: 'varchar', length: 255 })
  businessEmail!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  defaultTaxPercent!: number;

  @Column({ type: 'text', nullable: true })
  invoicePaymentMethodNote?: string;

  @OneToMany(() => User, (user) => user.tenant)
  users!: User[];

  @OneToMany(() => Customer, (customer) => customer.tenant)
  customers!: Customer[];

  @OneToMany(() => Job, (job) => job.tenant)
  jobs!: Job[];

  @OneToMany(() => Invoice, (invoice) => invoice.tenant)
  invoices!: Invoice[];
}
