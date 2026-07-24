import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameFirebaseUidToCognitoSub1784864126215 implements MigrationInterface {
    name = 'RenameFirebaseUidToCognitoSub1784864126215'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e621f267079194e5428e19af2f"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "firebaseUid" TO "cognitoSub"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8dae86a9940f71b14c18d868b3" ON "users"  ("cognitoSub") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8dae86a9940f71b14c18d868b3"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "cognitoSub" TO "firebaseUid"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e621f267079194e5428e19af2f" ON "users" USING btree ("firebaseUid") `);
    }

}
