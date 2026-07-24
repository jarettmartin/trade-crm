import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  AdminConfirmSignUpCommand,
  UserNotFoundException,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>(
      'COGNITO_REGION',
      'us-east-2',
    );
    this.userPoolId = this.configService.get<string>(
      'COGNITO_USER_POOL_ID',
      '',
    );
    this.clientId = this.configService.get<string>('COGNITO_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'COGNITO_CLIENT_SECRET',
      '',
    );
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
      '',
    );
    this.client = new CognitoIdentityProviderClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private computeSecretHash(username: string): string {
    const message = username + this.clientId;
    const hmac = crypto.createHmac('sha256', this.clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  async createUser(email: string, password: string) {
    // Use SignUp API which automatically sends a verification link email
    const signUpCommand = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      SecretHash: this.computeSecretHash(email),
      UserAttributes: [{ Name: 'email', Value: email }],
    });

    const result = await this.client.send(signUpCommand);
    const cognitoSub = result.UserSub || '';

    this.logger.log(`Cognito user created via SignUp: ${cognitoSub}`);

    return { uid: cognitoSub };
  }

  async getUserByEmail(email: string) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });
      const result = await this.client.send(command);
      return {
        uid: result.Username,
        emailVerified:
          result.UserAttributes?.find((a) => a.Name === 'email_verified')
            ?.Value === 'true',
        userStatus: result.UserStatus,
      };
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return null;
      }
      throw error;
    }
  }

  async getUser(uid: string) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: uid,
      });
      const result = await this.client.send(command);
      return {
        uid: result.Username,
        emailVerified:
          result.UserAttributes?.find((a) => a.Name === 'email_verified')
            ?.Value === 'true',
        userStatus: result.UserStatus,
      };
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        return null;
      }
      throw error;
    }
  }

  async deleteUser(uid: string): Promise<void> {
    const command = new AdminDeleteUserCommand({
      UserPoolId: this.userPoolId,
      Username: uid,
    });
    await this.client.send(command);
    this.logger.log(`Cognito user deleted: ${uid}`);
  }
}
