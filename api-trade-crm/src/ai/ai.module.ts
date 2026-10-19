import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiEstimatorController } from './controllers/ai-estimator.controller';
import { AnthropicClient } from './anthropic.client';
import { AiEstimatorService } from './services/ai-estimator.service';
import { AiUsageService } from './services/ai-usage.service';
import { CatalogMatcherService } from './services/catalog-matcher.service';
import { CatalogToolService } from './services/catalog-tool.service';
import { AiEstimationRequest } from './entities/ai-estimation-request.entity';
import { CatalogModule } from '../catalog/catalog.module';

/**
 * AI service estimator: natural-language matching against the caller's own
 * catalog.
 *
 * The tenant-scoped catalog read is reused from `CatalogModule`, so there is
 * one catalog search implementation and the AI can only ever see the caller's
 * items. Provider credentials stay in this module (env-driven) and never reach
 * the client. If `ANTHROPIC_API_KEY` is absent, only these endpoints degrade —
 * the rest of the API is unaffected.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AiEstimationRequest]),
    CatalogModule,
  ],
  controllers: [AiEstimatorController],
  providers: [
    AnthropicClient,
    AiUsageService,
    CatalogToolService,
    CatalogMatcherService,
    AiEstimatorService,
  ],
})
export class AiModule {}
