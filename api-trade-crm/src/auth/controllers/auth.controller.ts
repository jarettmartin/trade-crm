import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ConfirmForgotPasswordDto } from '../dto/confirm-forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('verify-status/:userId')
  async checkVerificationStatus(@Param('userId') userId: string) {
    return this.authService.checkVerificationStatus(userId);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Password reset code sent' };
  }

  @Post('confirm-forgot-password')
  async confirmForgotPassword(@Body() dto: ConfirmForgotPasswordDto) {
    await this.authService.confirmForgotPassword(
      dto.email,
      dto.code,
      dto.newPassword,
    );
    return { message: 'Password reset successfully' };
  }
}
