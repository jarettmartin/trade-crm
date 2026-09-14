import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryCatalogItemsDto extends PaginationDto {
  /**
   * Optional comma-separated list of item types to filter by,
   * e.g. ?type=SERVICE,MATERIAL. Omit for all types.
   */
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Optional free-text search applied across the table columns
   * (description, type, unit price), e.g. ?q=leaf.
   */
  @IsOptional()
  @IsString()
  q?: string;
}
