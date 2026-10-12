import { Entity, Column } from 'typeorm';
import { Exclude } from 'class-transformer';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';

/**
 * An in-app feedback / bug / feature-request / contact submission.
 *
 * Intentionally has **no relations and no foreign keys** to `tenants` or
 * `users`: this is support history that must survive a user or tenant being
 * changed or deleted, so the submitting ids and email are stored as plain
 * scalar columns. `tenantId` still comes from TenantScopedEntity because it is
 * what scopes every query — it is simply not enforced as an FK.
 *
 * Each submission also fires an internal notification email to the platform
 * support inbox; see `FeedbackEmailService` and the notification columns below.
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

  /**
   * ---- Internal notification email -------------------------------------
   *
   * Bookkeeping for the "new submission" email sent to the platform's support
   * inbox (`FEEDBACK_NOTIFY_EMAIL`). The submitting user is unaware the
   * notification exists, so every column here is `@Exclude()`d and
   * `FeedbackController` runs `ClassSerializerInterceptor` — the fields are
   * dropped during response serialization instead of relying on each call site
   * to remember to map them away.
   *
   * Nullable on purpose: rows that predate this feature (and rows inserted
   * directly by the demo seed) have no notification state at all, so NULL
   * means "not tracked" rather than a fabricated PENDING.
   */
  @Exclude()
  @Column({
    type: 'enum',
    enum: FeedbackEmailStatus,
    enumName: 'feedback_email_status_enum',
    nullable: true,
  })
  emailStatus?: FeedbackEmailStatus;

  /** Snapshot of the destination address at submit time. */
  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  emailRecipient?: string;

  /** SES message id of the accepted notification. */
  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  emailMessageId?: string;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  emailErrorMessage?: string;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  emailSentAt?: Date;
}
