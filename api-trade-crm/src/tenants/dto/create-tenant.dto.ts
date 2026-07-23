import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  Matches,
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
  @Matches(/^\+?[\d\s\-().]{7,20}$/, {
    message: 'Phone number is not valid',
  })
  phone?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultTaxPercent?: number;

  @IsString()
  @IsOptional()
  invoicePaymentMethodNote?: string;
}
