import { days } from '@nestjs/throttler';

/**
 * Daily email-send budgets, enforced by `EmailThrottlerGuard` on the email
 * endpoints. Named constants (not env vars) so the policy is reviewable in one
 * place — change the number here and redeploy.
 */
export const EMAIL_RATE_LIMITS = {
  /** `POST /invoices/:invoiceId/email` — per tenant, per day. */
  invoicePerTenantPerDay: 20,
  /** `POST /feedback` — per tenant, per day. */
  feedbackPerTenantPerDay: 10,
  /** `POST /contact` (public) — per client IP, per day. */
  contactPerIpPerDay: 3,
} as const;

/** The shared window for every email budget. */
export const EMAIL_RATE_WINDOW_MS = days(1);

/** Minimal shape of the parts of the request the tracker reads. */
export interface EmailThrottleRequest {
  ip?: string;
  user?: { tenantId?: string } | null;
}

/**
 * Buckets email sends by tenant when the request is authenticated, otherwise
 * by the client IP (the public contact form has no tenant).
 *
 * The `tenant:` / `ip:` prefixes keep the two scopes from ever sharing a
 * counter. `request.user` is set by `TenantGuard`, which must therefore run
 * first; `request.ip` is the real client address only because `trust proxy` is
 * enabled in `main.ts` (Caddy is the single reverse-proxy hop).
 */
export function resolveEmailThrottleTracker(
  request: EmailThrottleRequest,
): string {
  const tenantId = request.user?.tenantId;
  return tenantId ? `tenant:${tenantId}` : `ip:${request.ip ?? 'unknown'}`;
}
