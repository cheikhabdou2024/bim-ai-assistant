# ── RDS Subnet Group ──────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

# ── RDS PostgreSQL 15 ─────────────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "15.17"
  instance_class = var.db_instance_class    # db.t3.micro

  allocated_storage     = 20
  max_allocated_storage = 100               # Autoscaling jusqu'à 100 Go
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # ── Backups ──────────────────────────────────────────────────────────────
  backup_retention_period = 7               # 7 jours de backups automatiques
  backup_window           = "03:00-04:00"   # UTC — nuit africaine
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # ── Disponibilité ─────────────────────────────────────────────────────────
  multi_az               = var.environment == "production" ? true : false
  publicly_accessible    = false
  deletion_protection    = var.environment == "production" ? true : false
  skip_final_snapshot    = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "${local.name_prefix}-final-snapshot" : null

  # ── Performance ───────────────────────────────────────────────────────────
  performance_insights_enabled = true

  # ── Monitoring ────────────────────────────────────────────────────────────
  monitoring_interval = 60                  # Enhanced monitoring toutes les 60s
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  apply_immediately = var.environment == "staging" ? true : false

  tags = { Name = "${local.name_prefix}-postgres" }
}

# ── IAM role pour Enhanced Monitoring RDS ─────────────────────────────────
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
