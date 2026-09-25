import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

const FEEDBACK_TYPES = [
  FeedbackType.FEEDBACK,
  FeedbackType.BUG,
  FeedbackType.FEATURE_REQUEST,
  FeedbackType.CONTACT,
];

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_TYPES)
  type!: FeedbackType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}
