import { IsString, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { JobLineItemType } from '../../common/enums/job-line-item-type.enum';

export class CreateJobLineItemDto {
  @IsEnum(JobLineItemType)
  type!: JobLineItemType;

  @IsString()
  @MaxLength(500)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  lineTotal!: number;

  @Type(() => Number)
  @IsNumber()
  sortOrder!: number;
}
