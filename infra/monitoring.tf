# ── CloudWatch Alarms — Sprint 5 (ADR-015) ───────────────────────────────────
#
# Thresholds (conservative for MVP):
#   CPU  > 80 % for 2 consecutive 5-min periods  → ECS overloaded
#   ALB p95 latency > 2 s for 2 periods          → backend slow
#   ALB 5xx error rate > 1 % for 2 periods       → backend crashing
#   RDS CPU > 80 % for 2 periods                 → DB saturated
#
# All alarms publish to the ops SNS topic (email subscription added manually).
# ─────────────────────────────────────────────────────────────────────────────

# ── SNS topic for alarm notifications ────────────────────────────────────────

resource "aws_sns_topic" "ops_alerts" {
  name = "${local.name_prefix}-ops-alerts"
  tags = { Name = "${local.name_prefix}-ops-alerts" }
}

# ── ECS CPU — Backend ─────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "ecs_backend_cpu_high" {
  alarm_name          = "${local.name_prefix}-ecs-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend ECS CPU > 80% for 10 minutes — consider scaling out"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  tags = { Name = "${local.name_prefix}-alarm-ecs-backend-cpu" }
}

# ── ECS CPU — BIM Service ─────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "ecs_bim_cpu_high" {
  alarm_name          = "${local.name_prefix}-ecs-bim-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "BIM service ECS CPU > 80% for 10 minutes — IFC generation load"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.bim_service.name
  }

  tags = { Name = "${local.name_prefix}-alarm-ecs-bim-cpu" }
}

# ── ALB — p95 response time > 2 s ────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "alb_p95_latency_high" {
  alarm_name          = "${local.name_prefix}-alb-p95-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 2
  alarm_description   = "ALB p95 response time > 2 s — backend performance degraded"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = { Name = "${local.name_prefix}-alarm-alb-latency" }
}

# ── ALB — 5xx error rate > 1 % ───────────────────────────────────────────────
#
# Uses a metric math expression:
#   error_rate = HTTPCode_Target_5XX_Count / RequestCount * 100
# If RequestCount = 0 we treat it as not breaching (quiet period).

resource "aws_cloudwatch_metric_alarm" "alb_5xx_rate_high" {
  alarm_name          = "${local.name_prefix}-alb-5xx-rate-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 1
  alarm_description   = "ALB 5xx error rate > 1% for 10 minutes — backend crashing"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "IF(requests > 0, errors / requests * 100, 0)"
    label       = "5xx Error Rate (%)"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions  = { LoadBalancer = aws_lb.main.arn_suffix }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions  = { LoadBalancer = aws_lb.main.arn_suffix }
    }
  }

  tags = { Name = "${local.name_prefix}-alarm-alb-5xx" }
}

# ── RDS CPU > 80 % ───────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${local.name_prefix}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU > 80% for 10 minutes — query optimization or scale needed"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.identifier
  }

  tags = { Name = "${local.name_prefix}-alarm-rds-cpu" }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "ops_alerts_sns_arn" {
  description = "SNS topic ARN for ops alerts — subscribe your email via AWS Console"
  value       = aws_sns_topic.ops_alerts.arn
}
