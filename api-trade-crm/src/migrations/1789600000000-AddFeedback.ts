import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedback1789600000000 implements MigrationInterface {
  name = 'AddFeedback1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."feedback_type_enum" AS ENUM('FEEDBACK', 'BUG', 'FEATURE_REQUEST', 'CONTACT')`,
    );
    // No foreign keys on tenantId/userId on purpose: feedback history must
    // survive a user or tenant being changed or deleted (see Feedback entity).
    await queryRunner.query(
      `CREATE TABLE "feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "userId" uuid, "userEmail" character varying(255) NOT NULL, "type" "public"."feedback_type_enum" NOT NULL, "subject" character varying(255), "message" character varying(1000) NOT NULL, CONSTRAINT "PK_feedback" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_feedback_tenant" ON "feedback" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_feedback_user" ON "feedback" ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_feedback_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_feedback_tenant"`);
    await queryRunner.query(`DROP TABLE "feedback"`);
    await queryRunner.query(`DROP TYPE "public"."feedback_type_enum"`);
  }
}
