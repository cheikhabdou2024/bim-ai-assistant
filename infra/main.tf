terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — S3 bucket must exist before first apply
  # Bootstrap: bash infra/scripts/bootstrap-tfstate.sh
  backend "s3" {
    bucket         = "bim-ai-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "bim-ai-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "bim-ai-assistant"
    }
  }
}

# ── Data sources ──────────────────────────────────────────────────────────
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── Local values ──────────────────────────────────────────────────────────
locals {
  name_prefix  = "${var.project}-${var.environment}"
  account_id   = data.aws_caller_identity.current.account_id
  region       = data.aws_region.current.name
  ecr_base_url = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com"
}
