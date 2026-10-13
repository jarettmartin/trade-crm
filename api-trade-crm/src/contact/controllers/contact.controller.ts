import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from '../services/contact.service';
import { CreateContactSubmissionDto } from '../dto/create-contact-submission.dto';
import { EmailThrottlerGuard } from '../../email/guards/email-throttler.guard';
import {
  EMAIL_RATE_LIMITS,
  EMAIL_RATE_WINDOW_MS,
} from '../../email/email-throttle.config';

/**
 * Public contact form endpoint.
 *
 * **Intentionally unguarded** — this is the one write the unauthenticated site
 * needs, so visitors have no token to present. Nothing identity-related is
 * accepted from the body: a submission is only what the visitor typed, stored
 * in a tenant-free table (`ContactSubmission`).
 *
 * Applies `@Exclude()` on the entity to the response, the same way
 * `FeedbackController` does, so the internal notification-email columns never
 * reach the client.
 *
 * The only guard is `EmailThrottlerGuard`, which has no tenant to key on here
 * and therefore buckets by client IP (`EMAIL_RATE_LIMITS.contactPerIpPerDay`).
 */
@Controller('contact')
@UseInterceptors(ClassSerializerInterceptor)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @UseGuards(EmailThrottlerGuard)
  @Throttle({
    default: {
      limit: EMAIL_RATE_LIMITS.contactPerIpPerDay,
      ttl: EMAIL_RATE_WINDOW_MS,
    },
  })
  async create(@Body() dto: CreateContactSubmissionDto) {
    return this.contactService.create(dto);
  }
}
