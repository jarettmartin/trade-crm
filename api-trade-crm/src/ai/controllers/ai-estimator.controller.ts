import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AiEstimatorService } from '../services/ai-estimator.service';
import { EstimateCatalogMatchesDto } from '../dto/estimate-catalog-matches.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator';

/**
 * Natural-language catalog matching for the job detail page.
 *
 * Both routes require a verified token: the tenant scope and the per-user
 * budget are derived from `TenantGuard`'s decoded context, never from the
 * request body. The endpoint only *suggests* catalog items — creating line
 * items stays with `POST /jobs/:id/line-items`, after the user confirms.
 */
@Controller('ai/catalog-matches')
export class AiEstimatorController {
  constructor(private readonly aiEstimatorService: AiEstimatorService) {}

  /**
   * Suggest catalog line items for a free-text service description.
   * Rate limited to 3 requests per authenticated user per rolling hour; a
   * 429 carries a `retryAfterSeconds` hint. Bodies are validated
   * (non-empty, max 1000 chars) before any provider call.
   */
  @Post()
  @UseGuards(TenantGuard)
  async estimate(
    @Body() dto: EstimateCatalogMatchesDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.aiEstimatorService.estimate(
      dto.description,
      user.localUserId!,
      user.tenantId!,
    );
  }

  /** The caller's current budget, so the UI can show remaining uses. */
  @Get('usage')
  @UseGuards(TenantGuard)
  async usage(@CurrentUser() user: CurrentUserType) {
    return this.aiEstimatorService.getUsage(user.localUserId!);
  }
}
