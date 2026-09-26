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
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

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

  @Post()
  @UseGuards(TenantGuard)
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
