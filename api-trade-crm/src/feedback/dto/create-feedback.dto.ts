import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

const FEEDBACK_TYPES = [
  FeedbackType.FEEDBACK,
  FeedbackType.BUG,
  FeedbackType.FEATURE_REQUEST,
  FeedbackType.CONTACT,
];

/**
 * Normalizes string input *before* validation runs (the global ValidationPipe
 * transforms first, then validates), so the length rules are applied to what is
 * actually stored and a message of only whitespace is rejected rather than
 * saved as an empty string. Non-strings pass through untouched so `@IsString()`
 * still produces its own error.
 */
const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** As `trim`, but turns a blank result into `undefined` so `@IsOptional()` applies. */
const trimToUndefined = (params: TransformFnParams): unknown => {
  const value = trim(params);
  return value === '' ? undefined : value;
};

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_TYPES)
  type!: FeedbackType;

  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}
