import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { CognitoService } from './services/cognito.service';
import { InviteCode } from './entities/invite-code.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InviteCode, User, Tenant]), ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, CognitoService],
  exports: [CognitoService, AuthService],
})
export class AuthModule {}
