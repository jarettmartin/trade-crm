import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { CreateContactSubmissionDto } from '../dto/create-contact-submission.dto';

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
 */
@Controller('contact')
@UseInterceptors(ClassSerializerInterceptor)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async create(@Body() dto: CreateContactSubmissionDto) {
    return this.contactService.create(dto);
  }
}
