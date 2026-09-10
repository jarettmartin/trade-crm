variable "aws_region" {
  description = "AWS region for Lightsail resources."
  type        = string
  default     = "us-east-2"
}

variable "availability_zone" {
  description = "Lightsail availability zone (must exist in aws_region). Verify with `aws lightsail get-regions --include-availability-zones`."
  type        = string
  default     = "us-east-2a"
}

variable "instance_name" {
  description = "Name of the Lightsail instance (unique within the region)."
  type        = string
  default     = "sprout-crm-prod"
}

variable "blueprint_id" {
  description = "Lightsail OS blueprint. List with `aws lightsail get-blueprints`."
  type        = string
  default     = "ubuntu_22_04"
}

variable "bundle_id" {
  description = "Lightsail bundle (instance size). small_3_0 = $12/mo (2GB, 2 vCPU, IPv4 — recommended). micro_3_0 = $7/mo (1GB, risky for Playwright PDF builds)."
  type        = string
  default     = "small_3_0"
}

variable "ssh_key_name" {
  description = "Name of the Lightsail key pair to create/import."
  type        = string
  default     = "sprout-crm-prod-key"
}

variable "ssh_public_key" {
  description = "Public key material to import (contents of ~/.ssh/id_ed25519.pub)."
  type        = string
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed to SSH into the instance. Lock down to your IP in production, e.g. [\"203.0.113.5/32\"]."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Tags applied to Lightsail resources."
  type        = map(string)
  default = {
    Project = "sprout-crm"
    Env     = "prod"
  }
}

variable "ses_identity_domain" {
  description = "Domain verified in Amazon SES for sending invoice emails (DNS is in Cloudflare, records are printed by the ses_dkim_records output)."
  type        = string
  default     = "sprout-crm.com"
}

variable "ses_from_email" {
  description = "From address used for invoice emails (sub-address of ses_identity_domain)."
  type        = string
  default     = "no-reply@sprout-crm.com"
}
