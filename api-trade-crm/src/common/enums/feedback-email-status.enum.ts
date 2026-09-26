/**
 * Delivery status of the internal notification email for a feedback submission.
 *
 * This is platform-internal bookkeeping only: the outcome never reaches the
 * submitting user, and never affects the submission itself.
 *
 *   PENDING → send in flight
 *   SENT    → SES accepted the message
 *   FAILED  → send threw (also set on startup for stale PENDING rows)
 *   SKIPPED → no notification address configured, nothing was attempted
 */
export enum FeedbackEmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}
