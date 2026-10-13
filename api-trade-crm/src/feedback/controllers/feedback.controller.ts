import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';
import { EmailThrottlerGuard } from '../../email/guards/email-throttler.guard';
import {
  EMAIL_RATE_LIMITS,
  EMAIL_RATE_WINDOW_MS,
} from '../../email/email-throttle.config';

/**
 * Applies `@Exclude()` on the entity to every response from this controller:
 * the internal notification-email columns of `Feedback` are intentionally
 * invisible to clients. Registered per-controller (not globally) so the rest of
 * the API keeps serializing entities exactly as before.
 */
@Controller('feedback')
@UseInterceptors(ClassSerializerInterceptor)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Records a submission and fires the internal notification email.
   *
   * Rate limited per tenant, per day (`EMAIL_RATE_LIMITS.feedbackPerTenantPerDay`).
   */
  @Post()
  @UseGuards(TenantGuard, EmailThrottlerGuard)
  @Throttle({
    default: {
      limit: EMAIL_RATE_LIMITS.feedbackPerTenantPerDay,
      ttl: EMAIL_RATE_WINDOW_MS,
    },
  })
  async create(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Tenant/author always come from the verified token — never the body.
    return this.feedbackService.create(
      dto,
      user.tenantId!,
      user.localUserId,
      user.email,
    );
  }

  @Get()
  @UseGuards(TenantGuard)
  async findAll(
    @Query() query: PaginationDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.feedbackService.findAll(
      user.tenantId!,
      query.page ?? 1,
      query.limit ?? 10,
    );
  }
}
