# ── AWS Secrets Manager ───────────────────────────────────────────────────
# Stocker tous les secrets de l'application
# Les valeurs sont poussées via: aws secretsmanager put-secret-value

resource "aws_secretsmanager_secret" "backend" {
  name                    = "${local.name_prefix}/backend"
  description             = "Backend NestJS environment variables"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = { Name = "${local.name_prefix}-secret-backend" }
}

resource "aws_secretsmanager_secret_version" "backend" {
  secret_id = aws_secretsmanager_secret.backend.id

  # Les valeurs sensibles sont construites depuis les variables Terraform
  # (elles-mêmes fournies via terraform.tfvars ou CI secrets)
  secret_string = jsonencode({
    DATABASE_URL              = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
    REDIS_HOST                = aws_elasticache_replication_group.redis.primary_endpoint_address
    REDIS_PORT                = "6379"
    REDIS_PASSWORD            = var.redis_auth_token
    REDIS_TLS                 = "true"
    JWT_SECRET                = var.jwt_secret
    JWT_EXPIRES_IN            = "15m"
    REFRESH_TOKEN_EXPIRES_IN  = "7d"
    BCRYPT_ROUNDS             = "12"
    NODE_ENV                  = var.environment == "staging" ? "production" : var.environment
    PORT                      = "3000"
    FRONTEND_URL              = "https://${aws_cloudfront_distribution.frontend.domain_name}"
    ANTHROPIC_API_KEY         = var.anthropic_api_key
    AWS_REGION                = var.aws_region
    AWS_S3_BUCKET             = "${local.name_prefix}-models"
  })
}

resource "aws_secretsmanager_secret" "bim_service" {
  name                    = "${local.name_prefix}/bim-service"
  description             = "BIM Service Python environment variables"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = { Name = "${local.name_prefix}-secret-bim-service" }
}

resource "aws_secretsmanager_secret_version" "bim_service" {
  secret_id = aws_secretsmanager_secret.bim_service.id

  secret_string = jsonencode({
    ENVIRONMENT = var.environment
  })
}
