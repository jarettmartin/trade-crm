import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserType {
  uid: string;
  email: string;
  emailVerified: boolean;
  tenantId?: string;
  localUserId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUserType = request.user;
    return data ? user?.[data] : user;
  },
);
