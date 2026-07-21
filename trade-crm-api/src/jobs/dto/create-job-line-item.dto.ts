import { IsString, IsEnum, IsNumber, Min, MaxLength } from 'class-validator';
import { JobLineItemType } from '../../common/enums/job-line-item-type.enum';

export class CreateJobLineItemDto {
  @IsEnum(JobLineItemType)
  type!: JobLineItemType;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  lineTotal!: number;

  @IsNumber()
  @Min(0)
  sortOrder!: number;
}
