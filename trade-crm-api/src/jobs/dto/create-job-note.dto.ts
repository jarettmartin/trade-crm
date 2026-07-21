import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateJobNoteDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(1)
  note!: string;
}
