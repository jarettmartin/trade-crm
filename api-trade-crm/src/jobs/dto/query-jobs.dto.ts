import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JobStatus } from '../../common/enums/job-status.enum';

export class QueryJobsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
