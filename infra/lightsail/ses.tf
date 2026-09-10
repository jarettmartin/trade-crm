# =============================================================================
# SES: invoice email delivery infrastructure
#
# Terraform creates and verifies the SES sending domain (the "classic" SES
# resources are used so the DKIM CNAMEs can be emitted directly as output —
# DNS lives in Cloudflare, not Route53, so the
# aws_ses_domain_identity_verification helper resource is not usable here).
#
# IAM is intentionally NOT managed here: terraform runs with the restricted
# `sprout-crm-api` credentials (no IAM permissions — the account is managed
# via the AWS console), so the SES permission is attached to that user in the
# console alongside its other inline policies. See the "Console (one-time)"
# block below.
#
# Sequence after `terraform apply`:
#   1. Copy the `ses_dkim_records` output values into Cloudflare (3 CNAMEs,
#      DNS-only — do not proxy them).
#   2. Request SES production access (leave sandbox) via the AWS console — a
#      sandbox account can only send to verified recipients.
#
# =============================================================================

# ---- Console (one-time, admin) --------------------------------------------
# Attach the following inline policy to the `sprout-crm-api` IAM user
# (IAM > Users > sprout-crm-api > Permissions > Inline policies). It must
# cover BOTH the identity creation in this file AND the runtime send:
#
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Effect": "Allow",
#       "Action": [
#         "ses:VerifyDomainIdentity",
#         "ses:VerifyDomainDkim",
#         "ses:GetIdentityVerificationAttributes",
#         "ses:GetIdentityDkimAttributes",
#         "ses:SendEmail",
#         "ses:SendRawEmail"
#       ],
#       "Resource": "*"
#     }
#   ]
# }
# (ses:* is an acceptable simplification for this single-tenant MVP.)
# ---------------------------------------------------------------------------

resource "aws_ses_domain_identity" "this" {
  domain = var.ses_identity_domain
}

resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

output "ses_dkim_records" {
  description = "Easy DKIM CNAME records to add to Cloudflare (zone sprout-crm.com). DNS-only, do not proxy. One CNAME per token: Name = {token}._domainkey, Value = {token}.dkim.amazonses.com"
  value = {
    for token in aws_ses_domain_dkim.this.dkim_tokens :
    token => {
      name  = "${token}._domainkey.${aws_ses_domain_identity.this.domain}"
      type  = "CNAME"
      value = "${token}.dkim.amazonses.com"
    }
  }
}
