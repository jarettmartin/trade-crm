import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

/**
 * Subject types the *public* contact form accepts. A deliberately narrower set
 * than the in-app feedback types: a visitor with no account can send a general
 * enquiry or ask about Early Access, nothing else.
 */
const CONTACT_SUBJECT_TYPES = [FeedbackType.CONTACT, FeedbackType.EARLY_ACCESS];

/**
 * Normalizes string input *before* validation runs (the global ValidationPipe
 * transforms first, then validates), so length rules apply to what is stored.
 * Same helpers as `CreateFeedbackDto` — non-strings pass through untouched so
 * `@IsString()`/`@IsEmail()` still produce their own errors.
 */
const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** As `trim`, but turns a blank result into `undefined` so `@IsOptional()` applies. */
const trimToUndefined = (params: TransformFnParams): unknown => {
  const value = trim(params);
  return value === '' ? undefined : value;
};

export class CreateContactSubmissionDto {
  @IsIn(CONTACT_SUBJECT_TYPES)
  type!: FeedbackType;

  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email!: string;

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
