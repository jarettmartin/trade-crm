import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogItems1789000000000 implements MigrationInterface {
  name = 'AddCatalogItems1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."catalog_items_type_enum" AS ENUM('SERVICE', 'MATERIAL', 'FEE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "type" "public"."catalog_items_type_enum" NOT NULL, "description" character varying(500) NOT NULL, "unitPrice" numeric(10,2) NOT NULL, CONSTRAINT "PK_catalog_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_catalog_items_tenant" ON "catalog_items" ("tenantId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_items" ADD CONSTRAINT "FK_catalog_items_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_line_items" ADD "catalogItemId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_line_items" ADD CONSTRAINT "FK_job_line_items_catalog_item" FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_line_items" DROP CONSTRAINT "FK_job_line_items_catalog_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_line_items" DROP COLUMN "catalogItemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_items" DROP CONSTRAINT "FK_catalog_items_tenant"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_catalog_items_tenant"`);
    await queryRunner.query(`DROP TABLE "catalog_items"`);
    await queryRunner.query(`DROP TYPE "public"."catalog_items_type_enum"`);
  }
}
