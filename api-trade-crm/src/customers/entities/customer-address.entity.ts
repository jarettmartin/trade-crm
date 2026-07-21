import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { Customer } from './customer.entity';

@Entity('customer_addresses')
export class CustomerAddress extends TenantScopedEntity {
  @Column({ type: 'uuid' })
  customerId!: string;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ type: 'varchar', length: 255 })
  addressLine1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2?: string;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @Column({ type: 'varchar', length: 50 })
  stateProvince!: string;

  @Column({ type: 'varchar', length: 20 })
  zipPostalCode!: string;

  @Column({ type: 'varchar', length: 2 })
  countryCode!: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @ManyToOne(() => Customer, (customer) => customer.addresses)
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;
}
