import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('invite_codes')
export class InviteCode extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'int', nullable: true })
  maxUses?: number;

  @Column({ type: 'int', default: 0 })
  currentUses!: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;
}
