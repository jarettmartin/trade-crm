import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  EmailThrottleRequest,
  resolveEmailThrottleTracker,
} from '../email-throttle.config';

/**
 * Rate-limits the email-sending endpoints.
 *
 * A thin `ThrottlerGuard` subclass whose only job is to pick the right bucket:
 * the tenant id for authenticated requests (invoice emails, in-app feedback),
 * the client IP for the public contact form. The daily budget itself is set
 * per route with `@Throttle(...)`, and the 429 copy comes from the
 * `errorMessage` configured in `EmailModule`.
 *
 * Bound per route (never as a global `APP_GUARD`), so no other endpoint is
 * throttled. Must be declared *after* `TenantGuard` in `@UseGuards(...)` so the
 * tenant is on the request by the time the tracker reads it.
 */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: EmailThrottleRequest): Promise<string> {
    return Promise.resolve(resolveEmailThrottleTracker(req));
  }
}
