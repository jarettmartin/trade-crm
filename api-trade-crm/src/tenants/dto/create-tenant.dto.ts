import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  businessName!: string;

  @IsEmail()
  businessEmail!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultTaxPercent?: number;
}
