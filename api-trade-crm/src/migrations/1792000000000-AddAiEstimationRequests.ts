import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `ai_estimation_requests` — one row per AI estimation request that was
 * accepted for processing. It backs the per-user, per-rolling-hour budget on
 * the AI estimator (see `AiUsageService`): the row is written *before* the
 * paid provider call, so provider failures still consume the budget.
 *
 * Like `feedback`, deliberately has no foreign keys (plain scalar
 * `userId`/`tenantId`) so usage history survives a user or tenant being
 * changed/removed. The composite index makes the rolling-window count cheap.
 */
export class AddAiEstimationRequests1792000000000 implements MigrationInterface {
  name = 'AddAiEstimationRequests1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_estimation_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "userId" uuid NOT NULL, "tenantId" uuid NOT NULL, CONSTRAINT "PK_ai_estimation_requests" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_estimation_requests_user_created" ON "ai_estimation_requests" ("userId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_estimation_requests_user_created"`,
    );
    await queryRunner.query(`DROP TABLE "ai_estimation_requests"`);
  }
}
