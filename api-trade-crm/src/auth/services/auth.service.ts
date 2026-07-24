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
import * as crypto from 'crypto';
import { CognitoService } from './cognito.service';
import { InviteCode } from '../entities/invite-code.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cognitoService: CognitoService,
    private readonly configService: ConfigService,
    @InjectRepository(InviteCode)
    private readonly inviteCodeRepository: Repository<InviteCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
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

    // 3. Check if user already exists in Cognito
    const existingCognitoUser = await this.cognitoService.getUserByEmail(
      dto.email,
    );
    if (existingCognitoUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // 4. Create user in Cognito
    let cognitoUser;
    try {
      cognitoUser = await this.cognitoService.createUser(
        dto.email,
        dto.password,
      );
    } catch (error: any) {
      this.logger.error(
        `Cognito user creation failed: ${error.message}`,
        error.stack,
      );
      const awsMessage =
        error.name === 'InvalidPasswordException'
          ? 'Password does not meet policy requirements. Must be at least 8 characters with uppercase, lowercase, and numbers.'
          : error.message;
      throw new BadRequestException(awsMessage);
    }

    // 5. Create user in local database
    try {
      const user = this.userRepository.create({
        cognitoSub: cognitoUser.uid,
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

      this.logger.log(
        `User registered in Cognito, verification email handled by Cognito for ${dto.email}`,
      );

      return {
        id: user.id,
        email: user.email,
        status: user.status,
      };
    } catch (error: any) {
      await this.cognitoService
        .deleteUser(cognitoUser.uid)
        .catch((rollbackError) => {
          this.logger.error(
            `Failed to rollback Cognito user ${cognitoUser.uid}: ${rollbackError.message}`,
          );
        });

      throw new BadRequestException(
        `Failed to create user record: ${error.message}`,
      );
    }
  }

  async login(dto: LoginDto) {
    const clientId = this.configService.get<string>('COGNITO_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>(
      'COGNITO_CLIENT_SECRET',
      '',
    );
    const region = this.configService.get<string>(
      'COGNITO_REGION',
      'us-east-2',
    );

    const secretHash = this.computeSecretHash(
      clientSecret,
      dto.email,
      clientId,
    );

    const response = await fetch(
      `https://cognito-idp.${region}.amazonaws.com`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: clientId,
          AuthParameters: {
            USERNAME: dto.email,
            PASSWORD: dto.password,
            SECRET_HASH: secretHash,
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const message = data.message || data.__type || 'Invalid credentials';
      throw new UnauthorizedException(message);
    }

    const idToken = data.AuthenticationResult?.IdToken;
    const refreshToken = data.AuthenticationResult?.RefreshToken;

    if (!idToken) {
      throw new UnauthorizedException('No token returned from Cognito');
    }

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found in local database');
    }

    let tenant: Tenant | null = null;
    if (user.tenantId) {
      tenant = await this.tenantRepository.findOne({
        where: { id: user.tenantId },
      });
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      businessName: tenant?.businessName,
      businessEmail: tenant?.businessEmail,
      phone: tenant?.phone,
      defaultTaxPercent: tenant ? Number(tenant.defaultTaxPercent) : undefined,
      invoicePaymentMethodNote: tenant?.invoicePaymentMethodNote,
    };

    if (user.status === UserStatus.PENDING) {
      const cognitoUser = await this.cognitoService.getUser(user.cognitoSub);

      if (cognitoUser && cognitoUser.emailVerified) {
        user.status = UserStatus.ACTIVE;
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);

        return {
          idToken,
          refreshToken: refreshToken || '',
          expiresIn: String(data.AuthenticationResult?.ExpiresIn || 3600),
          localId: user.cognitoSub,
          user: { ...userResponse, status: user.status },
        };
      }

      throw new UnauthorizedException('Please verify email before signing in');
    }

    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('Account is disabled');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return {
      idToken,
      refreshToken: refreshToken || '',
      expiresIn: String(data.AuthenticationResult?.ExpiresIn || 3600),
      localId: user.cognitoSub,
      user: userResponse,
    };
  }

  async refreshToken(refreshToken: string): Promise<{
    idToken: string;
  }> {
    const clientId = this.configService.get<string>('COGNITO_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>(
      'COGNITO_CLIENT_SECRET',
      '',
    );
    const region = this.configService.get<string>(
      'COGNITO_REGION',
      'us-east-2',
    );

    // For REFRESH_TOKEN_AUTH, SECRET_HASH uses the client ID
    const secretHash = this.computeSecretHash(clientSecret, clientId, clientId);

    const response = await fetch(
      `https://cognito-idp.${region}.amazonaws.com`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: clientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
            SECRET_HASH: secretHash,
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const message = data.message || data.__type || 'Token refresh failed';
      throw new UnauthorizedException(message);
    }

    const idToken = data.AuthenticationResult?.IdToken;
    if (!idToken) {
      throw new UnauthorizedException('No token returned from refresh');
    }

    return { idToken };
  }

  async forgotPassword(email: string) {
    const clientId = this.configService.get<string>('COGNITO_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>(
      'COGNITO_CLIENT_SECRET',
      '',
    );
    const region = this.configService.get<string>(
      'COGNITO_REGION',
      'us-east-2',
    );

    const secretHash = this.computeSecretHash(clientSecret, email, clientId);

    const response = await fetch(
      `https://cognito-idp.${region}.amazonaws.com`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword',
        },
        body: JSON.stringify({
          ClientId: clientId,
          Username: email,
          SecretHash: secretHash,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new BadRequestException(
        data.message || data.__type || 'Failed to send password reset',
      );
    }
  }

  async confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string,
  ) {
    const clientId = this.configService.get<string>('COGNITO_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>(
      'COGNITO_CLIENT_SECRET',
      '',
    );
    const region = this.configService.get<string>(
      'COGNITO_REGION',
      'us-east-2',
    );

    const secretHash = this.computeSecretHash(clientSecret, email, clientId);

    const response = await fetch(
      `https://cognito-idp.${region}.amazonaws.com`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target':
            'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
        },
        body: JSON.stringify({
          ClientId: clientId,
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
          SecretHash: secretHash,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new BadRequestException(
        data.message || data.__type || 'Failed to reset password',
      );
    }
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

    const cognitoUser = await this.cognitoService.getUser(user.cognitoSub);

    if (!cognitoUser) {
      throw new BadRequestException('Cognito user not found');
    }

    if (cognitoUser.emailVerified) {
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

  private computeSecretHash(
    secret: string,
    username: string,
    clientId: string,
  ): string {
    const message = username + clientId;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    return hmac.digest('base64');
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
