import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';
import { Job } from './entities/job.entity';
import { JobNote } from './entities/job-note.entity';
import { JobLineItem } from './entities/job-line-item.entity';
import { CommonModule } from '../common/common.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobNote, JobLineItem]),
    CommonModule,
    // Line-item creation validates that a supplied catalogItemId belongs to
    // the caller's tenant before it is stored.
    CatalogModule,
  ],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
