import {
  IsIn,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CatalogItemType } from '../../common/enums/catalog-item-type.enum';

const CATALOG_ITEM_TYPES = [
  CatalogItemType.SERVICE,
  CatalogItemType.MATERIAL,
  CatalogItemType.FEE,
];

export class CreateCatalogItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @IsIn(CATALOG_ITEM_TYPES)
  type!: CatalogItemType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}
