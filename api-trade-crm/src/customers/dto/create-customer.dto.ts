import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerType } from '../../common/enums/customer-type.enum';
import { CreateAddressDto } from './create-address.dto';

export class CreateCustomerDto {
  @IsEnum(CustomerType)
  type!: CustomerType;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  companyName?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^\+?[\d\s\-().]{7,20}$/, {
    message: 'Phone number is not valid',
  })
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses!: CreateAddressDto[];
}
