import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent!: number;

  @IsNumber()
  @Min(0)
  taxAmount!: number;

  @IsNumber()
  @Min(0)
  total!: number;
}
