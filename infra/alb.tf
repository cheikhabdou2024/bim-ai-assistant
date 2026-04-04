# ── Application Load Balancer ─────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb"
    enabled = true
  }

  tags = { Name = "${local.name_prefix}-alb" }
}

# ── Target Groups ─────────────────────────────────────────────────────────
resource "aws_lb_target_group" "backend" {
  name        = "${local.name_prefix}-tg-backend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"   # Requis pour Fargate

  health_check {
    enabled             = true
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30   # Laisser les connexions se fermer proprement

  tags = { Name = "${local.name_prefix}-tg-backend" }
}

# ── Listeners ─────────────────────────────────────────────────────────────
# Staging sans domaine enregistré : HTTP uniquement sur port 80
# À migrer vers HTTPS + ACM quand staging.bim-ai.com sera configuré
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# ── S3 bucket for ALB access logs ─────────────────────────────────────────
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${local.name_prefix}-alb-logs"
  force_destroy = var.environment == "staging" ? true : false

  tags = { Name = "${local.name_prefix}-alb-logs" }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# REQUIRED: ALB access logs nécessitent une policy explicite pour le compte
# AWS du service ELB dans la région concernée.
# Référence: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
# Compte ELB eu-west-1 : 156460612806
resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ALBAccessLogs"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::156460612806:root"  # ELB service account eu-west-1
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${local.account_id}/*"
      },
      {
        Sid       = "AWSLogDeliveryAclCheck"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.alb_logs.arn
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.alb_logs]
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "expire-alb-logs"
    status = "Enabled"

    filter { prefix = "alb/" }

    expiration {
      days = 30
    }
  }
}
