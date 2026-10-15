import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * One row per AI estimation request that was **accepted for processing** —
 * recorded before the paid Anthropic call so a provider failure still counts
 * against the user's rolling-hour budget (failures can't be used to dodge the
 * cost cap). This is the storage for the 3-requests-per-hour per-user limit in
 * `AiUsageService`.
 *
 * Like `Feedback`, it deliberately has **no foreign keys** to `users` or
 * `tenants` (plain scalar columns) so usage history survives a user or tenant
 * being changed/removed. It is intentionally not exposed by any endpoint.
 */
@Entity('ai_estimation_requests')
@Index('IDX_ai_estimation_requests_user_created', ['userId', 'createdAt'])
export class AiEstimationRequest extends BaseEntity {
  /** Local user id from the verified token — never a client-supplied value. */
  @Column({ type: 'uuid' })
  userId!: string;

  /** Tenant the request was made in, from the verified token. */
  @Column({ type: 'uuid' })
  tenantId!: string;
}
