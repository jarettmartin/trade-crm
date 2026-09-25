import { Entity, Column } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

/**
 * An in-app feedback / bug / feature-request / contact submission.
 *
 * Intentionally has **no relations and no foreign keys** to `tenants` or
 * `users`: this is support history that must survive a user or tenant being
 * changed or deleted, so the submitting ids and email are stored as plain
 * scalar columns. `tenantId` still comes from TenantScopedEntity because it is
 * what scopes every query — it is simply not enforced as an FK.
 */
@Entity('feedback')
export class Feedback extends TenantScopedEntity {
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  /** Snapshot of the submitting user's email (survives the user row). */
  @Column({ type: 'varchar', length: 255 })
  userEmail!: string;

  @Column({
    type: 'enum',
    enum: FeedbackType,
    enumName: 'feedback_type_enum',
  })
  type!: FeedbackType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject?: string;

  @Column({ type: 'varchar', length: 1000 })
  message!: string;
}
