import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Job } from '../../jobs/entities/job.entity';
import { JobNote } from '../../jobs/entities/job-note.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  cognitoSub!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OWNER })
  role!: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status!: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @OneToMany(() => Job, (job) => job.assignedUser)
  assignedJobs!: Job[];

  @OneToMany(() => JobNote, (jobNote) => jobNote.user)
  jobNotes!: JobNote[];
}
