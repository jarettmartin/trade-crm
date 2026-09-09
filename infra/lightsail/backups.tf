# S3 bucket for daily database backups (private, encrypted).
resource "aws_s3_bucket" "backups" {
  bucket = "sprout-crm-backups"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
