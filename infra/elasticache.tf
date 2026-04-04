# ── ElastiCache Subnet Group ──────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-redis-subnet-group" }
}

# ── ElastiCache Redis 7 ───────────────────────────────────────────────────
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Redis for BIM AI - sessions + refresh tokens + cache"

  node_type            = var.redis_node_type   # cache.t3.micro
  num_cache_clusters   = var.environment == "production" ? 2 : 1  # Multi-AZ en prod
  port                 = 6379

  engine_version = "7.0"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # ── Sécurité ──────────────────────────────────────────────────────────────
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                  = var.redis_auth_token

  # ── Backups ───────────────────────────────────────────────────────────────
  snapshot_retention_limit = var.environment == "production" ? 5 : 1
  snapshot_window          = "02:00-03:00"     # UTC avant la maintenance RDS

  # ── Maintenance ───────────────────────────────────────────────────────────
  maintenance_window         = "sun:05:00-sun:06:00"
  auto_minor_version_upgrade = true

  apply_immediately = var.environment == "staging" ? true : false

  tags = { Name = "${local.name_prefix}-redis" }
}
