import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { CustomerType } from '../../common/enums/customer-type.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CustomerAddress } from './customer-address.entity';
import { Job } from '../../jobs/entities/job.entity';

@Entity('customers')
export class Customer extends TenantScopedEntity {
  @Column({ type: 'enum', enum: CustomerType, default: CustomerType.PERSON })
  type!: CustomerType;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName?: string;

  @Column({ type: 'varchar', length: 50 })
  phone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.customers)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @OneToMany(() => CustomerAddress, (address) => address.customer)
  addresses!: CustomerAddress[];

  @OneToMany(() => Job, (job) => job.customer)
  jobs!: Job[];
}
