import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { AI_DESCRIPTION_MAX_LENGTH } from '../ai-estimator.config';

/**
 * Normalizes the input *before* validation runs (the global ValidationPipe
 * transforms first, then validates), so the length rules apply to what is
 * actually sent to the provider. Non-strings pass through untouched so
 * `@IsString()` still produces its own error. Same helper as the contact DTO.
 */
const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class EstimateCatalogMatchesDto {
  /**
   * The user's free-text description of the work, e.g. "Replace two outdoor
   * light fixtures and supply weatherproof fittings." Bounded so a single
   * request can never build an oversized prompt.
   */
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(AI_DESCRIPTION_MAX_LENGTH)
  description!: string;
}
