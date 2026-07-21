import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';
import { Job } from './entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
