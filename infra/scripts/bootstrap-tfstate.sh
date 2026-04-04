#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Bootstrap Terraform State — BIM AI Assistant
# À exécuter UNE SEULE FOIS avant le premier terraform apply
# ─────────────────────────────────────────────────────────────
# Prérequis: AWS CLI configuré avec les droits suffisants
# Usage: bash infra/scripts/bootstrap-tfstate.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
STATE_BUCKET="bim-ai-terraform-state"
LOCK_TABLE="bim-ai-terraform-locks"

echo "Bootstrapping Terraform state infrastructure..."
echo "  Region: ${REGION}"
echo "  S3 Bucket: ${STATE_BUCKET}"
echo "  DynamoDB Table: ${LOCK_TABLE}"
echo ""

# ── S3 bucket pour le tfstate ────────────────────────────────
echo "Creating S3 bucket..."
aws s3api create-bucket \
  --bucket "${STATE_BUCKET}" \
  --region "${REGION}" \
  --create-bucket-configuration LocationConstraint="${REGION}"

# Versioning (récupération en cas de tfstate corrompu)
aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled

# Chiffrement AES256
aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Bloquer tout accès public
aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "  ✅ S3 bucket created: ${STATE_BUCKET}"

# ── DynamoDB table pour le locking ───────────────────────────
echo "Creating DynamoDB lock table..."
aws dynamodb create-table \
  --table-name "${LOCK_TABLE}" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${REGION}"

echo "  ✅ DynamoDB table created: ${LOCK_TABLE}"

echo ""
echo "✅ Bootstrap complete. You can now run:"
echo "   cd infra"
echo "   terraform init"
echo "   terraform workspace new staging"
echo "   terraform plan -var-file=envs/staging.tfvars"
echo "   terraform apply -var-file=envs/staging.tfvars"
