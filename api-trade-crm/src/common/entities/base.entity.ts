import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

/**
 * Base entity providing common columns for all tenant-owned entities.
 *
 * - id: UUID primary key
 * - createdAt: auto-set on creation
 * - updatedAt: auto-set on update
 * - deletedAt: used for soft deletes
 * - createdBy: nullable FK reference to the User who created the record
 * - updatedBy: nullable FK reference to the User who last updated the record
 *
 * Usage: export class MyEntity extends BaseEntity {}
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;
}
