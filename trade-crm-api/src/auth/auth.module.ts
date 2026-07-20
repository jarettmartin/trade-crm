import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { FirebaseService } from './services/firebase.service';
import { InviteCode } from './entities/invite-code.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InviteCode, User]), ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, FirebaseService],
  exports: [FirebaseService],
})
export class AuthModule {}
