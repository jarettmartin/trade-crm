import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { FirebaseService } from './firebase.service';
import { InviteCode } from '../entities/invite-code.entity';
import { User } from '../../users/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
    @InjectRepository(InviteCode)
    private readonly inviteCodeRepository: Repository<InviteCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Validate invite code
    await this.validateInviteCode(dto.inviteCode);

    // 2. Check if user already exists in our DB
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // 3. Check if user already exists in Firebase
    const existingFirebaseUser = await this.firebaseService.getUserByEmail(
      dto.email,
    );
    if (existingFirebaseUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // 4. Create user in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await this.firebaseService.createUser(
        dto.email,
        dto.password,
      );
    } catch (error: any) {
      this.logger.error(
        `Firebase user creation failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }

    // 5. Create user in local database
    try {
      const user = this.userRepository.create({
        firebaseUid: firebaseUser.uid,
        email: dto.email,
        firstName: '',
        lastName: '',
        role: UserRole.OWNER,
        status: UserStatus.PENDING,
      });

      await this.userRepository.save(user);

      // 6. Increment invite code usage
      await this.inviteCodeRepository.increment(
        { code: dto.inviteCode },
        'currentUses',
        1,
      );

      // 7. Send verification email
      try {
        const verificationLink =
          await this.firebaseService.generateEmailVerificationLink(dto.email);
        this.logger.log(
          `Verification email link generated for ${dto.email}: ${verificationLink}`,
        );
      } catch (emailError: any) {
        this.logger.warn(
          `Failed to generate verification link for ${dto.email}: ${emailError.message}`,
        );
      }

      return {
        id: user.id,
        email: user.email,
        status: user.status,
      };
    } catch (error: any) {
      // Rollback: delete the Firebase user if DB save fails
      await this.firebaseService
        .deleteUser(firebaseUser.uid)
        .catch((rollbackError) => {
          this.logger.error(
            `Failed to rollback Firebase user ${firebaseUser.uid}: ${rollbackError.message}`,
          );
        });

      throw new BadRequestException(
        `Failed to create user record: ${error.message}`,
      );
    }
  }

  async login(dto: LoginDto) {
    const apiKey = this.configService.get<string>('FIREBASE_WEB_API_KEY');

    // Authenticate with Firebase using the REST API (signInWithPassword)
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dto.email,
          password: dto.password,
          returnSecureToken: true,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const message = data.error?.message || 'Invalid credentials';
      throw new UnauthorizedException(message);
    }

    // Look up the local user
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found in local database');
    }

    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      localId: data.localId,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async checkVerificationStatus(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      return { id: user.id, email: user.email, status: user.status };
    }

    const firebaseUser = await this.firebaseService.getUser(user.firebaseUid);

    if (!firebaseUser) {
      throw new BadRequestException('Firebase user not found');
    }

    if (firebaseUser.emailVerified) {
      user.status = UserStatus.ACTIVE;
      await this.userRepository.save(user);
      this.logger.log(`User ${user.email} verified and activated`);
    }

    return {
      id: user.id,
      email: user.email,
      status: user.status,
    };
  }

  private async validateInviteCode(code: string): Promise<void> {
    const inviteCode = await this.inviteCodeRepository.findOne({
      where: { code },
    });

    if (!inviteCode) {
      throw new BadRequestException('Invalid invite code');
    }

    if (!inviteCode.active) {
      throw new BadRequestException('Invite code is no longer active');
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw new BadRequestException('Invite code has expired');
    }

    if (
      inviteCode.maxUses != null &&
      inviteCode.currentUses >= inviteCode.maxUses
    ) {
      throw new BadRequestException('Invite code has reached maximum uses');
    }
  }
}
