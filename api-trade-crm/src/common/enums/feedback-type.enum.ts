export enum FeedbackType {
  FEEDBACK = 'FEEDBACK',
  BUG = 'BUG',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  CONTACT = 'CONTACT',
  /**
   * Public "Early Access" enquiry from the unauthenticated contact form.
   * Deliberately *not* offered by the in-app feedback page (see
   * `CreateFeedbackDto`) — it is a contact-form-only subject type, but it lives
   * here so both submission tables share one set of values and labels.
   */
  EARLY_ACCESS = 'EARLY_ACCESS',
}
