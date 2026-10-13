import { describe, expect, it } from '@jest/globals';
import {
  EMAIL_RATE_LIMITS,
  EMAIL_RATE_WINDOW_MS,
  resolveEmailThrottleTracker,
} from './email-throttle.config';

describe('resolveEmailThrottleTracker', () => {
  it('buckets an authenticated request by tenant', () => {
    expect(
      resolveEmailThrottleTracker({
        ip: '203.0.113.7',
        user: { tenantId: 'tenant-1' },
      }),
    ).toBe('tenant:tenant-1');
  });

  it('buckets an anonymous request by client IP', () => {
    expect(resolveEmailThrottleTracker({ ip: '203.0.113.7' })).toBe(
      'ip:203.0.113.7',
    );
  });

  it('falls back to the IP when the user has no tenant', () => {
    expect(resolveEmailThrottleTracker({ ip: '203.0.113.7', user: {} })).toBe(
      'ip:203.0.113.7',
    );
  });

  it('never lets the tenant and IP scopes share a bucket', () => {
    const ip = '203.0.113.7';
    expect(
      resolveEmailThrottleTracker({ ip, user: { tenantId: ip } }),
    ).not.toBe(resolveEmailThrottleTracker({ ip }));
  });

  it('is stable when the IP is missing', () => {
    expect(resolveEmailThrottleTracker({})).toBe('ip:unknown');
  });
});

describe('email rate limits', () => {
  it('uses a one-day window for every budget', () => {
    expect(EMAIL_RATE_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('caps each email route at its daily budget', () => {
    expect(EMAIL_RATE_LIMITS.invoicePerTenantPerDay).toBe(20);
    expect(EMAIL_RATE_LIMITS.feedbackPerTenantPerDay).toBe(10);
    expect(EMAIL_RATE_LIMITS.contactPerIpPerDay).toBe(3);
  });
});
