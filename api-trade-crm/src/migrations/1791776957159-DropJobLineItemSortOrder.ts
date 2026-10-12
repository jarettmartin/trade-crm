import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropJobLineItemSortOrder1791776957159 implements MigrationInterface {
  name = 'DropJobLineItemSortOrder1791776957159';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Line items are displayed in the order they were added, which the API
    // now derives from "createdAt" instead of a client-supplied column.
    // Rows written in a single batch can share a timestamp, so give the
    // duplicates distinct (sub-millisecond) ones first — in their current
    // "sortOrder" order — so dropping the column cannot reshuffle how a
    // job's items are shown.
    await queryRunner.query(`
            UPDATE "job_line_items" AS li
               SET "createdAt" = li."createdAt" + (dup.rn::int * interval '1 microsecond')
              FROM (
                SELECT id,
                       row_number() OVER (
                         PARTITION BY "jobId", "createdAt" ORDER BY "sortOrder", id
                       ) - 1 AS rn
                  FROM "job_line_items"
              ) AS dup
             WHERE dup.id = li.id
               AND dup.rn > 0
        `);

    await queryRunner.query(
      `ALTER TABLE "job_line_items" DROP COLUMN "sortOrder"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_line_items" ADD "sortOrder" integer NOT NULL DEFAULT 0`,
    );

    // Rebuild the ordering from the order the rows are displayed in.
    await queryRunner.query(`
            UPDATE "job_line_items" AS li
               SET "sortOrder" = ordered.rn::int
              FROM (
                SELECT id,
                       row_number() OVER (
                         PARTITION BY "jobId" ORDER BY "createdAt", id
                       ) - 1 AS rn
                  FROM "job_line_items"
              ) AS ordered
             WHERE ordered.id = li.id
        `);
  }
}
