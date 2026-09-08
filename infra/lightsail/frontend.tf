# =============================================================================
# Frontend: S3 static site + CloudFront + ACM certificate
#
# The SPA is built and uploaded to S3 (see scripts/deploy-frontend.sh) and
# served over HTTPS by CloudFront using a us-east-1 ACM certificate.
# =============================================================================

# ACM cert for the frontend. CloudFront requires the certificate to live in
# us-east-1 (hence the provider alias). DNS validation record lives in Cloudflare.
resource "aws_acm_certificate" "frontend" {
  provider          = aws.virginia
  domain_name       = "sprout-crm.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_s3_bucket" "frontend" {
  bucket = "sprout-crm-web"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Public read for the static site (CloudFront pulls from the website endpoint).
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "frontend" {
  provider            = aws.virginia
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Sprout CRM frontend (S3 static site)"
  default_root_object = "index.html"
  aliases             = ["sprout-crm.com"]
  price_class         = "PriceClass_100"
  http_version        = "http2"

  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "sprout-crm-web-s3"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 30
      origin_keepalive_timeout = 5
    }
  }

  default_cache_behavior {
    target_origin_id       = "sprout-crm-web-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # SPA routing: 403/404 fall back to index.html.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.frontend.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

output "frontend_domain" {
  description = "CloudFront distribution domain for the frontend."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "acm_validation_records" {
  description = "DNS validation records to add to Cloudflare for the ACM certificate."
  value = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
