import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import type { CognitoService } from './cognito.service';
import type { LoginDto } from '../dto/login.dto';
import { InviteCode } from '../entities/invite-code.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

const LOCKOUT_MESSAGE =
  'Too many failed sign-in attempts. Please wait 15 minutes and try again, or reset your password.';

function makeService() {
  const config = {
    get: jest.fn((_key: string, fallback?: string) => fallback ?? ''),
  };

  return new AuthService(
    {} as CognitoService,
    config as unknown as ConfigService,
    {} as Repository<InviteCode>,
    {} as Repository<User>,
    {} as Repository<Tenant>,
  );
}

/** Makes the Cognito InitiateAuth call answer with an AWS-style error body. */
function mockCognitoError(body: { __type: string; message: string }) {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status: 400,
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

const loginDto: LoginDto = {
  email: 'owner@example.com',
  password: 'wrong-password',
};

describe('AuthService.login error messages', () => {
  let service: AuthService;

  beforeEach(() => {
    service = makeService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('explains the Cognito lockout and how to recover', async () => {
    mockCognitoError({
      __type: 'NotAuthorizedException',
      message: 'Password attempts exceeded',
    });

    await expect(service.login(loginDto)).rejects.toThrow(LOCKOUT_MESSAGE);
  });

  it('does not leak Cognito wording for a normal bad password', async () => {
    mockCognitoError({
      __type: 'NotAuthorizedException',
      message: 'Incorrect username or password.',
    });

    await expect(service.login(loginDto)).rejects.toThrow(
      'Incorrect email or password',
    );
  });

  it('tells an unverified user to verify their email', async () => {
    mockCognitoError({
      __type: 'UserNotConfirmedException',
      message: 'User is not confirmed.',
    });

    await expect(service.login(loginDto)).rejects.toThrow(
      'Please verify your email before signing in',
    );
  });
});
