import {
  IsString,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateJobDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  customerAddressId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
