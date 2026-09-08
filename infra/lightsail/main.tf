terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state by default — the simplest possible setup, no extra AWS
  # resources required. Copy `terraform.tfstate` somewhere safe, or enable the
  # commented backend below if you later want shared/remote state.
  #
  # backend "s3" {
  #   bucket         = "sprout-crm-terraform-state"
  #   key            = "lightsail/terraform.tfstate"
  #   region         = "us-east-2"
  #   encrypt        = true
  #   dynamodb_table = "sprout-crm-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront requires ACM certificates in us-east-1, so we add a second
# provider alias for that region.
provider "aws" {
  alias  = "virginia"
  region = "us-east-1"
}
