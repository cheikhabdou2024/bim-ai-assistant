# Branch Protection — BIM AI Assistant
# Runbook — À exécuter AVANT le premier merge Sprint 2

> **Responsable :** DevOps Lead
> **Priorité :** P1 — À faire avant toute PR Sprint 2
> **Estimé :** 10 minutes

---

## Pourquoi c'est critique

Sans branch protection, les workflows CI tournent mais **ne bloquent pas** les merges.
Un dev peut merger une PR avec des tests en échec.
Ce runbook configure les règles qui rendent le CI obligatoire.

---

## Règles configurées

### Branch `develop`

| Règle | Valeur | Raison |
|-------|--------|--------|
| Required status checks | ✅ CI Backend + Frontend + BIM | Bloque merge si tests fail |
| Up to date before merge | ✅ Strict | Force rebase sur develop avant merge |
| No force push | ✅ | Historique immuable |
| Conversation resolution | ✅ | Tout commentaire doit être résolu |
| PR review required | ❌ | Flexibilité Sprint 1-2 (1 dev actif) |

### Branch `main`

| Règle | Valeur | Raison |
|-------|--------|--------|
| Required status checks | ✅ CI Backend + Frontend + BIM | Idem develop |
| Up to date before merge | ✅ Strict | — |
| No force push | ✅ | **JAMAIS** sur main |
| Conversation resolution | ✅ | — |
| PR review required | ✅ **1 reviewer** | Gate qualité production |
| Dismiss stale reviews | ✅ | Nouveau commit → re-review obligatoire |

### Workflows E2E

Le workflow E2E (`e2e.yml`) **n'est PAS un status check bloquant**.
Il tourne post-merge sur develop/main uniquement.
Raison : trop lent (~10 min) pour bloquer les PRs — risque de flakiness.

Si E2E fail post-merge → alerte DevOps Lead → investigation dans l'heure (MTTR cible).

---

## Méthode 1 — Script automatisé (recommandé)

**Prérequis :**
- `gh` CLI installé : `winget install GitHub.cli` (Windows)
- Authentifié : `gh auth login`
- Repo créé sur GitHub

```bash
# Depuis la racine du projet
export GITHUB_OWNER=ton-username-ou-org
export GITHUB_REPO=bim-ai-assistant

bash .github/scripts/setup-branch-protection.sh
```

---

## Méthode 2 — Interface GitHub (manuelle)

Si le script ne fonctionne pas :

1. Aller sur `https://github.com/OWNER/REPO/settings/branches`
2. Cliquer **Add branch protection rule**

### Pour `develop` :

- Branch name pattern : `develop`
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Ajouter ces checks :
    - `Lint + Unit Tests`
    - `Build`
    - `Lint + TypeScript + Build`
    - `Pytest + Health Check`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

### Pour `main` :

- Branch name pattern : `main`
- ✅ Require a pull request before merging
  - Required approvals : **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks (mêmes 4 checks que develop)
- ✅ Require conversation resolution
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

---

## Vérification post-setup

```bash
# Vérifie la protection de develop
gh api repos/OWNER/REPO/branches/develop/protection | jq '.required_status_checks.checks[].context'

# Vérifie la protection de main
gh api repos/OWNER/REPO/branches/main/protection | jq '{
  checks: .required_status_checks.checks[].context,
  reviews: .required_pull_request_reviews.required_approving_review_count,
  force_push: .allow_force_pushes.enabled
}'
```

**Résultat attendu develop :**
```json
"Lint + Unit Tests"
"Build"
"Lint + TypeScript + Build"
"Pytest + Health Check"
```

**Résultat attendu main :**
```json
{
  "checks": ["Lint + Unit Tests", "Build", "Lint + TypeScript + Build", "Pytest + Health Check"],
  "reviews": 1,
  "force_push": false
}
```

---

## Workflow de merge Sprint 2

```
feature/PROJ-xxx
    │
    ▼
PR → develop
    │  CI requis (4 checks verts)
    │  Conversation resolution
    ▼
develop (auto-deploy staging — Sprint 4)
    │
    ▼
PR → main
    │  CI requis (4 checks verts)
    │  1 reviewer approval
    │  Conversation resolution
    ▼
main (deploy production — avec approval manuel)
```

---

## Qui exécute ce runbook

**DevOps Lead** — avant le Kickoff Sprint 2.
Confirmer à **Tech Lead Ops** par message une fois fait.
