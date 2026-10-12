import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `contact_submissions` — submissions from the public (unauthenticated)
 * contact form.
 *
 * Deliberately **not** tenant-scoped: a visitor with no account has no tenant,
 * so the table has no `tenantId` column at all. It otherwise mirrors `feedback`
 * (same `type` values via the shared enum, same notification-email bookkeeping)
 * so support handles both the same way.
 *
 * Also adds the `EARLY_ACCESS` subject type the contact form can pre-select.
 */
export class AddContactSubmissions1791900000000 implements MigrationInterface {
  name = 'AddContactSubmissions1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Shared with `feedback` on purpose: both tables use `feedback_type_enum`
    // so they agree on the values and the labels map to both.
    //
    // Postgres 12+ allows `ADD VALUE` inside a transaction as long as the new
    // *value* is not used in that same transaction — this migration only
    // references the *type* (the CREATE TABLE below), so it is safe to run in
    // TypeORM's default all-in-one-transaction mode.
    await queryRunner.query(
      `ALTER TYPE "public"."feedback_type_enum" ADD VALUE IF NOT EXISTS 'EARLY_ACCESS'`,
    );

    // No foreign keys anywhere: like `feedback`, this is support history that
    // must survive everything else. No indexes either — the only reads are
    // ad-hoc support queries and the startup sweep for stale PENDING rows.
    await queryRunner.query(
      `CREATE TABLE "contact_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "email" character varying(255) NOT NULL, "type" "public"."feedback_type_enum" NOT NULL, "subject" character varying(255), "message" character varying(1000) NOT NULL, "emailStatus" "public"."feedback_email_status_enum", "emailRecipient" character varying(255), "emailMessageId" character varying(255), "emailErrorMessage" text, "emailSentAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_contact_submissions" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contact_submissions"`);
    // `EARLY_ACCESS` is intentionally left on `feedback_type_enum`: Postgres
    // cannot drop a single enum value, and rows may still reference it.
  }
}
