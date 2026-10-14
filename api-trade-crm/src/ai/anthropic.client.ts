import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AI_REQUEST_TIMEOUT_MS, DEFAULT_AI_MODEL } from './ai-estimator.config';

/** Thrown when the estimator is used without `ANTHROPIC_API_KEY` configured. */
export class AiNotConfiguredError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not configured');
    this.name = 'AiNotConfiguredError';
  }
}

/**
 * Server-side wrapper around the Anthropic SDK.
 *
 * The API key never leaves the server — the Ionic client talks only to our own
 * `/ai/catalog-matches` endpoint. If the key is missing the client reports
 * itself as unconfigured rather than throwing at construction, so a
 * misconfigured (or intentionally key-less) deployment still boots and every
 * unrelated feature keeps working; only the estimator endpoints return a
 * graceful error.
 */
@Injectable()
export class AnthropicClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY')?.trim();
    this.model =
      this.configService.get<string>('ANTHROPIC_MODEL')?.trim() ||
      DEFAULT_AI_MODEL;

    // Bounded retries + timeout: aim for one quick retry on a transient blip,
    // never an unbounded retry loop.
    this.client = apiKey
      ? new Anthropic({
          apiKey,
          timeout: AI_REQUEST_TIMEOUT_MS,
          maxRetries: 1,
        })
      : null;

    if (!this.client) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set — AI catalog matching is disabled.',
      );
    }
  }

  /** True when an API key is present, so a call can be attempted. */
  get configured(): boolean {
    return this.client !== null;
  }

  /** The model the estimator will call (from env, defaulting to Haiku). */
  get modelId(): string {
    return this.model;
  }

  /** Send one Messages API request with the configured model. */
  async createMessage(
    params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>,
  ): Promise<Anthropic.Message> {
    if (!this.client) {
      throw new AiNotConfiguredError();
    }
    return this.client.messages.create({ ...params, model: this.model });
  }
}
