variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment: staging | production"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "project" {
  description = "Project name (used for resource naming)"
  type        = string
  default     = "bim-ai"
}

# ── VPC ────────────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["eu-west-1a", "eu-west-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ── RDS ───────────────────────────────────────────────────────────────────
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "bim_ai"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "bim_user"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password (use AWS Secrets Manager in prod)"
  type        = string
  sensitive   = true
}

# ── ElastiCache ───────────────────────────────────────────────────────────
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_auth_token" {
  description = "Redis AUTH token (min 16 chars)"
  type        = string
  sensitive   = true
}

# ── ECS ───────────────────────────────────────────────────────────────────
variable "backend_image" {
  description = "Backend Docker image (ECR URI:tag)"
  type        = string
}

variable "bim_service_image" {
  description = "BIM Service Docker image (ECR URI:tag)"
  type        = string
}

variable "backend_cpu" {
  description = "ECS backend task CPU units"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "ECS backend task memory (MB)"
  type        = number
  default     = 1024
}

variable "bim_cpu" {
  description = "ECS BIM service task CPU units"
  type        = number
  default     = 1024
}

variable "bim_memory" {
  description = "ECS BIM service task memory (MB)"
  type        = number
  default     = 2048
}

variable "backend_desired_count" {
  description = "Desired number of backend ECS tasks"
  type        = number
  default     = 2
}

# ── App config ────────────────────────────────────────────────────────────
variable "jwt_secret" {
  description = "JWT secret key (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key (Sprint 3)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "frontend_domain" {
  description = "Frontend domain name"
  type        = string
  default     = "app.bim-ai.com"
}

variable "api_domain" {
  description = "API domain name"
  type        = string
  default     = "api.bim-ai.com"
}
