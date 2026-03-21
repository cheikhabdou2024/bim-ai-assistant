#!/usr/bin/env bash
# ============================================================
# Branch Protection Setup — BIM AI Assistant
# ============================================================
# Usage:
#   export GITHUB_TOKEN=ghp_xxxxx
#   export GITHUB_OWNER=your-org-or-username
#   export GITHUB_REPO=bim-ai-assistant
#   bash .github/scripts/setup-branch-protection.sh
#
# Requires: gh CLI (https://cli.github.com/) or curl + jq
# ============================================================

set -euo pipefail

OWNER="${GITHUB_OWNER:?Set GITHUB_OWNER}"
REPO="${GITHUB_REPO:?Set GITHUB_REPO}"

echo "Configuring branch protection for ${OWNER}/${REPO}..."

# ── Required CI status checks (must match exact workflow job names) ──────────
REQUIRED_CHECKS_DEVELOP='[
  "Lint + Unit Tests",
  "Build",
  "Lint + TypeScript + Build",
  "Pytest + Health Check"
]'

REQUIRED_CHECKS_MAIN='[
  "Lint + Unit Tests",
  "Build",
  "Lint + TypeScript + Build",
  "Pytest + Health Check"
]'

apply_protection() {
  local branch="$1"
  local required_checks="$2"
  local require_review="$3"   # true | false
  local dismiss_stale="$4"    # true | false

  echo "  Applying protection to branch: ${branch}"

  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/${OWNER}/${REPO}/branches/${branch}/protection" \
    --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "checks": $(echo "${required_checks}" | jq '[.[] | {"context": ., "app_id": null}]')
  },
  "enforce_admins": false,
  "required_pull_request_reviews": $(
    if [ "${require_review}" = "true" ]; then
      echo "{
        \"dismissal_restrictions\": {},
        \"dismiss_stale_reviews\": ${dismiss_stale},
        \"require_code_owner_reviews\": false,
        \"required_approving_review_count\": 1
      }"
    else
      echo "null"
    fi
  ),
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true
}
EOF

  echo "  ✅ ${branch} protected"
}

# ── develop ──────────────────────────────────────────────────────────────────
# - Required CI checks (bloquants)
# - No mandatory PR review (1 dev teams — flexibility)
# - No force push
apply_protection "develop" "${REQUIRED_CHECKS_DEVELOP}" "false" "false"

# ── main ─────────────────────────────────────────────────────────────────────
# - Required CI checks (bloquants)
# - 1 PR review mandatory (code quality gate)
# - Dismiss stale reviews on new push
# - No force push (JAMAIS sur main)
apply_protection "main" "${REQUIRED_CHECKS_MAIN}" "true" "true"

echo ""
echo "✅ Branch protection applied:"
echo "   develop → CI required (no force push, conversation resolution)"
echo "   main    → CI required + 1 review + dismiss stale (no force push)"
echo ""
echo "Verify at: https://github.com/${OWNER}/${REPO}/settings/branches"
