import { Entity, Column } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { FeedbackEmailStatus } from '../../common/enums/feedback-email-status.enum';

/**
 * A submission from the **public** (unauthenticated) contact form.
 *
 * Deliberately extends `BaseEntity` rather than `TenantScopedEntity`: the whole
 * point of this table is that a visitor with no account has no tenant, so a
 * `tenantId` column simply does not exist here (the same reasoning that keeps
 * `feedback` free of foreign keys — this is support history that must outlive
 * everything else). Multi-tenancy therefore stays strict: nothing tenant-scoped
 * ever reads this table.
 *
 * It mirrors `Feedback`'s shape so the two submission types behave identically
 * for support: the same `type` values (shared via `FeedbackType`, and the same
 * Postgres enum), the same "internal notification email" bookkeeping, and the
 * same notification template pipeline. `email` is the visitor's address, stored
 * so support can reply to them directly.
 */
@Entity('contact_submissions')
export class ContactSubmission extends BaseEntity {
  /**
   * The visitor's email — required by the form, because a contact enquiry is
   * useless to support without a way to answer it.
   */
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /**
   * The enquiry's subject type (e.g. CONTACT, EARLY_ACCESS). Shares
   * `feedback_type_enum` with `feedback` so both tables agree on the values and
   * `FeedbackEmailService`'s labels apply to both.
   */
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
   * Identical contract to `Feedback`: the columns below track the "new
   * submission" email sent to the platform support inbox
   * (`FEEDBACK_NOTIFY_EMAIL`), they are `@Exclude()`d and the controller runs
   * `ClassSerializerInterceptor`, so the submitting visitor never sees them.
   * Nullable on purpose so NULL means "not tracked".
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
