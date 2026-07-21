import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '../../common/enums/job-status.enum';
import { CreateJobNoteDto } from './create-job-note.dto';
import { CreateJobLineItemDto } from './create-job-line-item.dto';

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @IsUUID()
  @IsOptional()
  customerAddressId?: string;

  @IsUUID()
  @IsOptional()
  assignedUserId?: string;

  @IsString()
  @IsOptional()
  scheduledStart?: string;

  @IsString()
  @IsOptional()
  scheduledEnd?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateJobNoteDto)
  notes?: CreateJobNoteDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateJobLineItemDto)
  lineItems?: CreateJobLineItemDto[];
}
