# ── Outputs — valeurs exportées après terraform apply ─────────────────────

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_bim_service_url" {
  description = "ECR repository URL for BIM service"
  value       = aws_ecr_repository.bim_service.repository_url
}

output "alb_dns_name" {
  description = "ALB DNS name (configure CNAME in DNS)"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain (configure CNAME in DNS)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "backend_service_name" {
  description = "ECS backend service name"
  value       = aws_ecs_service.backend.name
}

output "bim_service_name" {
  description = "ECS BIM service name"
  value       = aws_ecs_service.bim_service.name
}

output "frontend_s3_bucket" {
  description = "S3 bucket for frontend assets"
  value       = aws_s3_bucket.frontend.bucket
}

output "github_actions_access_key_id" {
  description = "AWS Access Key ID for GitHub Actions (add to GitHub Secrets)"
  value       = aws_iam_access_key.github_actions.id
  sensitive   = true
}

output "github_actions_secret_access_key" {
  description = "AWS Secret Access Key for GitHub Actions (add to GitHub Secrets)"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}

output "staging_urls" {
  description = "Staging access URLs (no custom domain — using AWS defaults)"
  value = {
    api_url      = "http://${aws_lb.main.dns_name}"
    frontend_url = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  }
}
