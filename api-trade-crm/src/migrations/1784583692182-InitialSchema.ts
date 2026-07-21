import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784583692182 implements MigrationInterface {
    name = 'InitialSchema1784583692182'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invite_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "code" character varying(64) NOT NULL, "description" character varying(255), "active" boolean NOT NULL DEFAULT true, "maxUses" integer, "currentUses" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6c0ede25edb23ae63c935138e33" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e8034125cb28e0814cd5a526c2" ON "invite_codes"  ("code") `);
        await queryRunner.query(`CREATE TABLE "job_notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "jobId" uuid NOT NULL, "userId" uuid NOT NULL, "note" text NOT NULL, CONSTRAINT "PK_d47318c2d46876276baa37b0613" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."job_line_items_type_enum" AS ENUM('SERVICE', 'MATERIAL', 'FEE', 'DISCOUNT')`);
        await queryRunner.query(`CREATE TABLE "job_line_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "jobId" uuid NOT NULL, "type" "public"."job_line_items_type_enum" NOT NULL, "description" character varying(500) NOT NULL, "quantity" numeric(10,2) NOT NULL, "unitPrice" numeric(10,2) NOT NULL, "lineTotal" numeric(12,2) NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_876b22558c7727e0a2ef4dbf96d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('DRAFT', 'ISSUED', 'PAID', 'VOID', 'SUPERSEDED')`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "jobId" uuid NOT NULL, "invoiceNumber" integer NOT NULL, "version" integer NOT NULL DEFAULT '1', "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'DRAFT', "subtotal" numeric(12,2) NOT NULL, "taxPercent" numeric(5,2) NOT NULL, "taxAmount" numeric(12,2) NOT NULL, "total" numeric(12,2) NOT NULL, "issuedAt" TIMESTAMP WITH TIME ZONE, "paidAt" TIMESTAMP WITH TIME ZONE, "snapshot" jsonb NOT NULL, CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."jobs_status_enum" AS ENUM('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "customerId" uuid NOT NULL, "customerAddressId" uuid NOT NULL, "assignedUserId" uuid, "title" character varying(255) NOT NULL, "description" text, "status" "public"."jobs_status_enum" NOT NULL DEFAULT 'DRAFT', "scheduledStart" TIMESTAMP WITH TIME ZONE, "scheduledEnd" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('OWNER')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('PENDING', 'ACTIVE', 'DISABLED')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid, "firebaseUid" character varying(128) NOT NULL, "email" character varying(255) NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'OWNER', "status" "public"."users_status_enum" NOT NULL DEFAULT 'PENDING', "lastLoginAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e621f267079194e5428e19af2f" ON "users"  ("firebaseUid") `);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "businessName" character varying(255) NOT NULL, "businessEmail" character varying(255) NOT NULL, "phone" character varying(50), "defaultTaxPercent" numeric(5,2) NOT NULL DEFAULT '0', "invoicePaymentMethodNote" text, CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."customers_type_enum" AS ENUM('PERSON', 'BUSINESS')`);
        await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "type" "public"."customers_type_enum" NOT NULL DEFAULT 'PERSON', "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "companyName" character varying(255), "phone" character varying(50) NOT NULL, "email" character varying(255), "notes" text, CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "customer_addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "tenantId" uuid NOT NULL, "customerId" uuid NOT NULL, "label" character varying(100) NOT NULL, "addressLine1" character varying(255) NOT NULL, "addressLine2" character varying(255), "city" character varying(100) NOT NULL, "stateProvince" character varying(50) NOT NULL, "zipPostalCode" character varying(20) NOT NULL, "countryCode" character varying(2) NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_336bda7b0a0cd04241f719fc834" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "job_notes" ADD CONSTRAINT "FK_4821084b0738c4633547e17e7be" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_notes" ADD CONSTRAINT "FK_891521c7fd22cf32dc77f93495b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_line_items" ADD CONSTRAINT "FK_41647aaaeb360cb44cc824861e3" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_89c82485e364081f457b210120d" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_304ee0ea0e714d0fbd767cc7ca9" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "jobs" ADD CONSTRAINT "FK_8231b5f5f898c6608094a5553bc" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "jobs" ADD CONSTRAINT "FK_15be39eec1b46b46690fd5460d0" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "jobs" ADD CONSTRAINT "FK_3f53ed1aea79a46eabe77d6bdd9" FOREIGN KEY ("customerAddressId") REFERENCES "customer_addresses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "jobs" ADD CONSTRAINT "FK_e093dc364517718b57f2a6cc942" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_c58f7e88c286e5e3478960a998b" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_37c1a605468d156e6a8f78f1dc5" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_addresses" ADD CONSTRAINT "FK_7bd088b1c8d3506953240ebf030" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer_addresses" DROP CONSTRAINT "FK_7bd088b1c8d3506953240ebf030"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_37c1a605468d156e6a8f78f1dc5"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_c58f7e88c286e5e3478960a998b"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_e093dc364517718b57f2a6cc942"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_3f53ed1aea79a46eabe77d6bdd9"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_15be39eec1b46b46690fd5460d0"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_8231b5f5f898c6608094a5553bc"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_304ee0ea0e714d0fbd767cc7ca9"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_89c82485e364081f457b210120d"`);
        await queryRunner.query(`ALTER TABLE "job_line_items" DROP CONSTRAINT "FK_41647aaaeb360cb44cc824861e3"`);
        await queryRunner.query(`ALTER TABLE "job_notes" DROP CONSTRAINT "FK_891521c7fd22cf32dc77f93495b"`);
        await queryRunner.query(`ALTER TABLE "job_notes" DROP CONSTRAINT "FK_4821084b0738c4633547e17e7be"`);
        await queryRunner.query(`DROP TABLE "customer_addresses"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP TYPE "public"."customers_type_enum"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e621f267079194e5428e19af2f"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "jobs"`);
        await queryRunner.query(`DROP TYPE "public"."jobs_status_enum"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`DROP TABLE "job_line_items"`);
        await queryRunner.query(`DROP TYPE "public"."job_line_items_type_enum"`);
        await queryRunner.query(`DROP TABLE "job_notes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8034125cb28e0814cd5a526c2"`);
        await queryRunner.query(`DROP TABLE "invite_codes"`);
    }

}
