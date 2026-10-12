import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the internal notification-email bookkeeping to `feedback`.
 *
 * Every column is nullable on purpose: rows created before this feature (and
 * rows inserted directly by the demo seed) have no notification state at all,
 * so NULL means "not tracked" instead of a fabricated PENDING that the startup
 * recovery sweep would then flip to FAILED.
 *
 * No indexes: these columns are only ever written by the sender and read
 * ad hoc for support (the only query is the startup sweep for stale PENDING
 * rows, which is a tiny table scan).
 */
export class AddFeedbackEmailTracking1789700000000 implements MigrationInterface {
  name = 'AddFeedbackEmailTracking1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."feedback_email_status_enum" AS ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD "emailStatus" "public"."feedback_email_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD "emailRecipient" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD "emailMessageId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD "emailErrorMessage" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD "emailSentAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "emailSentAt"`);
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP COLUMN "emailErrorMessage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP COLUMN "emailMessageId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP COLUMN "emailRecipient"`,
    );
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "emailStatus"`);
    await queryRunner.query(`DROP TYPE "public"."feedback_email_status_enum"`);
  }
}
