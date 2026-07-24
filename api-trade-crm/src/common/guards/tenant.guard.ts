import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { User } from '../../users/entities/user.entity';
import { AuthService } from '../../auth/services/auth.service';

export interface AuthenticatedTenantUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  tenantId: string;
  localUserId: string;
}

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly client: JwksClient;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const region = this.configService.get<string>(
      'COGNITO_REGION',
      'us-east-2',
    );
    const userPoolId = this.configService.get<string>(
      'COGNITO_USER_POOL_ID',
      '',
    );
    const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    this.client = new JwksClient({ jwksUri });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    // Try to verify the current token
    let decodedToken: any;
    try {
      decodedToken = await this.verifyToken(token);
    } catch (tokenError: any) {
      // Token expired — attempt transparent refresh
      const refreshToken = (request.headers['x-refresh-token'] as string) || '';

      if (!refreshToken) {
        throw new UnauthorizedException(
          'Token expired and no refresh token provided',
        );
      }

      try {
        const result = await this.authService.refreshToken(refreshToken);
        response.setHeader('x-new-id-token', result.idToken);
        decodedToken = await this.verifyToken(result.idToken);
        this.logger.log('Token refreshed successfully via TenantGuard');
      } catch (refreshError: any) {
        this.logger.warn(`Token refresh failed: ${refreshError.message}`);
        throw new UnauthorizedException('Session expired, please log in again');
      }
    }

    // Look up the local user with tenantId
    const user = await this.userRepository.findOne({
      where: { cognitoSub: decodedToken.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found in local database');
    }

    if (!user.tenantId) {
      throw new UnauthorizedException(
        'User must belong to a tenant to perform this action',
      );
    }

    // Attach full user context to request
    request.user = {
      uid: decodedToken.sub,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      tenantId: user.tenantId,
      localUserId: user.id,
    } as AuthenticatedTenantUser;

    return true;
  }

  private async verifyToken(token: string): Promise<any> {
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error('Invalid token header');
    }

    const key = await this.client.getSigningKey(decodedHeader.header.kid);
    const signingKey = key.getPublicKey();

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        signingKey,
        {
          algorithms: ['RS256'],
          issuer: `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_vpllPmEOD`,
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        },
      );
    });
  }
}
