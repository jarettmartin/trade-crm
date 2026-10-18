/**
 * Tunables for the AI service estimator (natural-language catalog matcher).
 *
 * Named constants (not env vars) so the cost/abuse policy is reviewable in one
 * place — change a number here and redeploy. Values that genuinely depend on
 * the deployment (the API key and the model name) come from the environment
 * instead — see `AnthropicClient`.
 */

/**
 * Default model. Claude Haiku 5.5 is the cheapest current model and is built
 * for exactly this kind of short classification/extraction work. Overridable
 * with `ANTHROPIC_MODEL` so the model can be changed without a code change.
 */
export const DEFAULT_AI_MODEL = 'claude-haiku-5-5';

/**
 * AI estimation requests allowed per authenticated user, per rolling hour.
 * This is a hard cap on paid provider calls, so it is enforced *before* the
 * Anthropic request is made (see `AiUsageService`).
 */
export const AI_RATE_LIMIT_PER_USER_PER_HOUR = 3;

/** The rolling window the per-user budget is measured over. */
export const AI_RATE_WINDOW_MS = 60 * 60 * 1000;

/** Longest service description the estimator accepts (also the prompt cap). */
export const AI_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Hard cap on tool-use round trips. The loop stops early on a normal `end_turn`
 *; this only bounds a model that keeps asking for the catalog.
 */
export const AI_MAX_TOOL_ITERATIONS = 5;

/**
 * Catalog rows returned per `search_catalog` call. This is also the bound on
 * "list the whole catalog": an empty query returns up to this many rows, which
 * covers any realistic trade catalog while keeping the payload finite.
 */
export const AI_MAX_TOOL_RESULTS = 200;

/** Cap on the model's output tokens. */
export const AI_MAX_OUTPUT_TOKENS = 1024;

/** Per-request timeout for the provider call. */
export const AI_REQUEST_TIMEOUT_MS = 30_000;

/** Most suggestions we will return, and the most the model is asked for. */
export const AI_MAX_SUGGESTIONS = 10;
