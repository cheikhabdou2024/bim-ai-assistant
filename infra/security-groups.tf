# ── ALB Security Group ────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-sg-alb"
  description = "ALB - allow HTTP from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "${local.name_prefix}-sg-alb" }
}

# ── Backend ECS Security Group ────────────────────────────────────────────
resource "aws_security_group" "backend" {
  name        = "${local.name_prefix}-sg-backend"
  description = "Backend ECS tasks - allow traffic from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound (ECR pull, DB, Redis, Anthropic API)"
  }

  tags = { Name = "${local.name_prefix}-sg-backend" }
}

# ── BIM Service Security Group ────────────────────────────────────────────
resource "aws_security_group" "bim_service" {
  name        = "${local.name_prefix}-sg-bim-service"
  description = "BIM Service - allow traffic from backend only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
    description     = "From backend ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound (ECR pull)"
  }

  tags = { Name = "${local.name_prefix}-sg-bim-service" }
}

# ── RDS Security Group ────────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-sg-rds"
  description = "PostgreSQL - allow from backend ECS only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
    description     = "PostgreSQL from backend"
  }

  tags = { Name = "${local.name_prefix}-sg-rds" }
}

# ── ElastiCache Security Group ────────────────────────────────────────────
resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-sg-redis"
  description = "Redis - allow from backend ECS only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
    description     = "Redis from backend"
  }

  tags = { Name = "${local.name_prefix}-sg-redis" }
}
