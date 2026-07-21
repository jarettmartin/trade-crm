import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine1!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  stateProvince!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  zipPostalCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode!: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
