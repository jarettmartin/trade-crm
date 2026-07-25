import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  @IsString()
  @IsOptional()
  username?: string;
}
