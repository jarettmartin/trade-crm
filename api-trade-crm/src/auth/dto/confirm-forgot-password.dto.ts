import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class ConfirmForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
