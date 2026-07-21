import { IsString, MinLength } from 'class-validator';

export class SearchCustomerDto {
  @IsString()
  @MinLength(1)
  q!: string;
}
