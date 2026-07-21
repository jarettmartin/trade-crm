import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { Reflector } from '@nestjs/core';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

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

    this.logger.log(
      `Token received (first 20 chars): ${token.substring(0, 20)}...`,
    );

    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      this.logger.log(`Token verified for uid: ${decodedToken.uid}`);
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        emailVerified: decodedToken.email_verified || false,
      } as AuthenticatedUser;
      return true;
    } catch (error: any) {
      this.logger.warn(`Firebase token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
