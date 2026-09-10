import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { InvoiceEmailStatus } from '../../common/enums/invoice-email-status.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Invoice } from './invoice.entity';

/**
 * Records a single attempt to email an invoice to the customer.
 *
 * Keeps a snapshot of the details at send time (recipient, status, reference
 * to the invoice) so history is preserved even if the invoice data changes.
 *
 * Lifecycle:
 *   PENDING → SENT | FAILED
 *
 * PENDING attempts that never resolve (e.g. the server restarted mid-send)
 * are flagged FAILED on startup by InvoiceEmailService.
 */
@Entity('invoice_email_attempts')
export class InvoiceEmailAttempt extends TenantScopedEntity {
  @Index('IDX_invoice_email_attempts_invoice')
  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'varchar', length: 255 })
  recipientEmail!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fromEmail?: string;

  @Column({
    type: 'enum',
    enum: InvoiceEmailStatus,
    default: InvoiceEmailStatus.PENDING,
  })
  status!: InvoiceEmailStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  messageId?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ type: 'jsonb' })
  snapshot!: object;

  @ManyToOne(() => Tenant, (tenant) => tenant.invoiceEmailAttempts)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => Invoice, (invoice) => invoice.emailAttempts)
  @JoinColumn({ name: 'invoiceId' })
  invoice!: Invoice;
}
