import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EmailService } from './services/email.service';
import { EmailThrottlerGuard } from './guards/email-throttler.guard';
import {
  EMAIL_RATE_LIMITS,
  EMAIL_RATE_WINDOW_MS,
} from './email-throttle.config';

@Module({
  imports: [
    ConfigModule,
    // The email routes are the only throttled endpoints, so the feature module
    // owns the configuration — there is deliberately no global APP_GUARD
    // ThrottlerGuard. A single 1-day window is defined here and every route
    // sets its own budget with @Throttle(...) (the limit below is only the
    // fallback for a route that forgets to). Over-limit requests get a 429 with
    // this message, which the web client shows verbatim.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          // The one set for this module, named `default` (the library's
          // convention) so responses carry standard, unsuffixed `Retry-After` /
          // `X-RateLimit-*` headers.
          name: 'default',
          ttl: EMAIL_RATE_WINDOW_MS,
          limit: EMAIL_RATE_LIMITS.invoicePerTenantPerDay,
        },
      ],
      errorMessage: 'Daily email limit reached. Please try again tomorrow.',
    }),
  ],
  providers: [EmailService, EmailThrottlerGuard],
  exports: [EmailService, EmailThrottlerGuard],
})
export class EmailModule {}
