import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { Job } from './job.entity';
import { User } from '../../users/entities/user.entity';

@Entity('job_notes')
export class JobNote extends TenantScopedEntity {
  @Column({ type: 'uuid' })
  jobId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  note!: string;

  @ManyToOne(() => Job, (job) => job.notes)
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @ManyToOne(() => User, (user) => user.jobNotes)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
