import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';
import { Job } from './entities/job.entity';
import { JobNote } from './entities/job-note.entity';
import { JobLineItem } from './entities/job-line-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobNote, JobLineItem])],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
