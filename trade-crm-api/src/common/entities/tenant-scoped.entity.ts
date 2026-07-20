import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Extends BaseEntity with a tenantId for multi-tenant isolation.
 * All tenant-owned entities should extend this.
 */
export abstract class TenantScopedEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  tenantId!: string;
}
