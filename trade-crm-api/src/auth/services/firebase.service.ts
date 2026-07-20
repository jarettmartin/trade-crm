import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const serviceAccountPath = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_PATH',
    );
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

    if (getApps().length === 0) {
      const serviceAccount = require(path.resolve(serviceAccountPath!));
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
      this.logger.log('Firebase Admin SDK initialized');
    }
  }

  async createUser(email: string, password: string) {
    return getAuth().createUser({
      email,
      password,
      emailVerified: false,
    });
  }

  async getUserByEmail(email: string) {
    try {
      return await getAuth().getUserByEmail(email);
    } catch {
      return null;
    }
  }

  async getUser(uid: string) {
    try {
      return await getAuth().getUser(uid);
    } catch {
      return null;
    }
  }

  async generateEmailVerificationLink(email: string): Promise<string> {
    return getAuth().generateEmailVerificationLink(email);
  }

  async deleteUser(uid: string): Promise<void> {
    return getAuth().deleteUser(uid);
  }
}
