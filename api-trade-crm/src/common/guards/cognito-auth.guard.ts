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

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);
  private readonly jwksUri: string;
  private readonly client: JwksClient;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>(
      'COGNITO_REGION',
      'us-east-2',
    );
    const userPoolId = this.configService.get<string>(
      'COGNITO_USER_POOL_ID',
      '',
    );
    this.jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    this.client = new JwksClient({ jwksUri: this.jwksUri });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      const decoded = await this.verifyToken(token);
      request.user = {
        uid: decoded.sub,
        email: decoded.email || '',
        emailVerified: decoded.email_verified === true,
      } as AuthenticatedUser;
      return true;
    } catch (error: any) {
      this.logger.warn(`Cognito token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async verifyToken(token: string): Promise<any> {
    // Decode the token header to get the kid
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error('Invalid token header');
    }

    // Get the signing key from JWKS
    const key = await this.client.getSigningKey(decodedHeader.header.kid);
    const signingKey = key.getPublicKey();

    // Verify the token
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        signingKey,
        {
          algorithms: ['RS256'],
          issuer: `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_vpllPmEOD`,
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        },
      );
    });
  }
}
