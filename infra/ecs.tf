# ── ECS Cluster ───────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${local.name_prefix}-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ── CloudWatch Log Groups ──────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}/backend"
  retention_in_days = 30
  tags              = { Name = "${local.name_prefix}-logs-backend" }
}

resource "aws_cloudwatch_log_group" "bim_service" {
  name              = "/ecs/${local.name_prefix}/bim-service"
  retention_in_days = 30
  tags              = { Name = "${local.name_prefix}-logs-bim-service" }
}

# ── Backend Task Definition ────────────────────────────────────────────────
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu     # 512
  memory                   = var.backend_memory  # 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_image
      essential = true

      portMappings = [
        { containerPort = 3000, protocol = "tcp" }
      ]

      # Secrets injectés depuis AWS Secrets Manager
      secrets = [
        { name = "DATABASE_URL",             valueFrom = "${aws_secretsmanager_secret.backend.arn}:DATABASE_URL::" },
        { name = "REDIS_HOST",               valueFrom = "${aws_secretsmanager_secret.backend.arn}:REDIS_HOST::" },
        { name = "REDIS_PORT",               valueFrom = "${aws_secretsmanager_secret.backend.arn}:REDIS_PORT::" },
        { name = "REDIS_PASSWORD",           valueFrom = "${aws_secretsmanager_secret.backend.arn}:REDIS_PASSWORD::" },
        { name = "REDIS_TLS",                valueFrom = "${aws_secretsmanager_secret.backend.arn}:REDIS_TLS::" },
        { name = "JWT_SECRET",               valueFrom = "${aws_secretsmanager_secret.backend.arn}:JWT_SECRET::" },
        { name = "JWT_EXPIRES_IN",           valueFrom = "${aws_secretsmanager_secret.backend.arn}:JWT_EXPIRES_IN::" },
        { name = "REFRESH_TOKEN_EXPIRES_IN", valueFrom = "${aws_secretsmanager_secret.backend.arn}:REFRESH_TOKEN_EXPIRES_IN::" },
        { name = "BCRYPT_ROUNDS",            valueFrom = "${aws_secretsmanager_secret.backend.arn}:BCRYPT_ROUNDS::" },
        { name = "NODE_ENV",                 valueFrom = "${aws_secretsmanager_secret.backend.arn}:NODE_ENV::" },
        { name = "PORT",                     valueFrom = "${aws_secretsmanager_secret.backend.arn}:PORT::" },
        { name = "FRONTEND_URL",             valueFrom = "${aws_secretsmanager_secret.backend.arn}:FRONTEND_URL::" },
        { name = "ANTHROPIC_API_KEY",        valueFrom = "${aws_secretsmanager_secret.backend.arn}:ANTHROPIC_API_KEY::" },
        { name = "AWS_REGION",               valueFrom = "${aws_secretsmanager_secret.backend.arn}:AWS_REGION::" },
        { name = "AWS_S3_BUCKET",            valueFrom = "${aws_secretsmanager_secret.backend.arn}:AWS_S3_BUCKET::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -sf http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      readonlyRootFilesystem = false   # Prisma a besoin d'écrire
    }
  ])

  tags = { Name = "${local.name_prefix}-task-backend" }
}

# ── BIM Service Task Definition ────────────────────────────────────────────
resource "aws_ecs_task_definition" "bim_service" {
  family                   = "${local.name_prefix}-bim-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.bim_cpu     # 1024
  memory                   = var.bim_memory  # 2048 — IfcOpenShell est gourmand
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "bim-service"
      image     = var.bim_service_image
      essential = true

      portMappings = [
        { containerPort = 8000, protocol = "tcp" }
      ]

      environment = [
        { name = "ENVIRONMENT", value = var.environment }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.bim_service.name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -sf http://localhost:8000/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = { Name = "${local.name_prefix}-task-bim-service" }
}

# ── Backend ECS Service ────────────────────────────────────────────────────
resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count

  launch_type = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  # Rolling deployment — zero downtime
  deployment_circuit_breaker {
    enable   = true
    rollback = true   # Rollback automatique si le déploiement échoue
  }

  deployment_controller {
    type = "ECS"
  }

  depends_on = [aws_lb_listener.http]

  lifecycle {
    ignore_changes = [task_definition, desired_count]  # Géré par le CD
  }

  tags = { Name = "${local.name_prefix}-service-backend" }
}

# ── BIM Service ECS Service ────────────────────────────────────────────────
resource "aws_ecs_service" "bim_service" {
  name            = "${local.name_prefix}-bim-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.bim_service.arn
  desired_count   = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.bim_service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.bim_service.arn
    container_name   = "bim-service"
    container_port   = 8000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener_rule.bim_service]

  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = { Name = "${local.name_prefix}-service-bim-service" }
}

# ── Auto Scaling Backend ───────────────────────────────────────────────────
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 8
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${local.name_prefix}-backend-scale-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
