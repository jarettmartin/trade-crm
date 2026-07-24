import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { AuthService } from '../../auth/services/auth.service';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);
  private readonly client: JwksClient;

  constructor(
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
    try {
      const decoded = await this.verifyToken(token);
      request.user = {
        uid: decoded.sub,
        email: decoded.email || '',
        emailVerified: decoded.email_verified === true,
      } as AuthenticatedUser;
      return true;
    } catch (tokenError: any) {
      // Token is expired or invalid — attempt transparent refresh
      const refreshToken = (request.headers['x-refresh-token'] as string) || '';

      if (!refreshToken) {
        throw new UnauthorizedException(
          'Token expired and no refresh token provided',
        );
      }

      try {
        const result = await this.authService.refreshToken(refreshToken);
        // Return the new token to the client via response header
        response.setHeader('x-new-id-token', result.idToken);
        // Verify the new token
        const decoded = await this.verifyToken(result.idToken);
        request.user = {
          uid: decoded.sub,
          email: decoded.email || '',
          emailVerified: decoded.email_verified === true,
        } as AuthenticatedUser;
        this.logger.log('Token refreshed successfully via guard');
        return true;
      } catch (refreshError: any) {
        this.logger.warn(`Token refresh failed: ${refreshError.message}`);
        throw new UnauthorizedException('Session expired, please log in again');
      }
    }
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
