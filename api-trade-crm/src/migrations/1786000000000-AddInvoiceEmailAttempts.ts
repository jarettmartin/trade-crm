import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceEmailAttempts1786000000000 implements MigrationInterface {
  name = 'AddInvoiceEmailAttempts1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invoice_email_attempts_status_enum" AS ENUM('PENDING', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoice_email_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "invoiceId" uuid NOT NULL, "recipientEmail" character varying(255) NOT NULL, "fromEmail" character varying(255), "status" "public"."invoice_email_attempts_status_enum" NOT NULL DEFAULT 'PENDING', "subject" character varying(255), "messageId" character varying(255), "errorMessage" text, "sentAt" TIMESTAMP WITH TIME ZONE, "snapshot" jsonb NOT NULL, CONSTRAINT "PK_7d8e2c27ff89e26f430db6d1792" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_email_attempts_invoice" ON "invoice_email_attempts" ("invoiceId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_email_attempts" ADD CONSTRAINT "FK_invoice_email_attempts_invoice" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_email_attempts" ADD CONSTRAINT "FK_invoice_email_attempts_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice_email_attempts" DROP CONSTRAINT "FK_invoice_email_attempts_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_email_attempts" DROP CONSTRAINT "FK_invoice_email_attempts_invoice"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_invoice_email_attempts_invoice"`,
    );
    await queryRunner.query(`DROP TABLE "invoice_email_attempts"`);
    await queryRunner.query(
      `DROP TYPE "public"."invoice_email_attempts_status_enum"`,
    );
  }
}
