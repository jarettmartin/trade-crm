import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  invoicePaymentMethodNote?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultTaxPercent?: number;
}
