# Sprint 1 Kickoff — Ordre de passage des agents

> **Principe :** Architects et Leads d'abord. Développeurs ensuite.
> **Durée totale :** 3 sessions (avant de toucher au code)
> **Résultat :** Chaque développeur reçoit un plan validé par son lead.

---

## Vue d'ensemble

```
SESSION 1          SESSION 2              SESSION 3
──────────         ──────────────────     ──────────────────────
CTO                Tech Lead Archi        Tech Lead Dev
(30 min)           + 3 Architects         + 3 Leads Dev
                   (2h)                   (2h)
   ↓                    ↓                      ↓
Scope validé       Architecture           Plans d'implémentation
                   validée                validés par équipe
                        ↓
                   Tech Lead Ops
                   + DevOps Lead
                   + QA Lead
                   (1h)
                        ↓
                   Infra + CI/CD
                   + Test strategy
                   validés

                   ──────────────────────────────────────────
                   SEULEMENT APRÈS → Développeurs commencent
```

---

## SESSION 1 — Validation Stratégique (CTO)

**Objectif :** CTO valide le scope, la stack, et les priorités Sprint 1.
**Commande :** `/project:cto`

**Prompt à utiliser :**
```
CTO, nous démarrons le Sprint 1 de BIM AI Assistant.

Contexte :
- Validation technique : Tests 2/3 réussis (IfcOpenShell ✅, Three.js ✅, Claude API ⏳ crédits)
- Stack validée : React + Three.js / NestJS / PostgreSQL / Python FastAPI
- MVP scope : Auth + Projects CRUD + AI Chat + 3D Viewer

Sprint 1 objectif : Application fonctionnelle avec authentification complète.

Valide :
1. La stack technique choisie (ADR-001 à ADR-004 dans ARCHITECTURE.md)
2. Le scope Sprint 1 (Auth uniquement)
3. Les priorités (P0 → P1 → P2)
4. Les risques identifiés et mitigations
5. Le budget Anthropic API pour les tests

Donne ton approbation ou tes ajustements.
```

**Livrable attendu du CTO :**
- Validation (ou ajustements) de la stack
- Confirmation du scope Sprint 1
- Risques identifiés + mitigations
- Budget API approuvé

**→ Passage à Session 2 seulement après approbation CTO.**

---

## SESSION 2A — Architecture (Tech Lead Architecture + Architects)

**Objectif :** Valider l'architecture technique de Sprint 1 avant tout code.
**Ordre interne : Architects produisent → Tech Lead Architecture valide**

### 2A-1 : Solution Architect
**Commande :** `/project:solution-architect`

```
Solution Architect, Sprint 1 démarre.

Objectif Sprint 1 : Module Auth complet (register, login, refresh, logout)

Produis :
1. ADR-001 : Architecture Auth (JWT + httpOnly cookies vs localStorage)
2. Diagramme de flux auth (register → email verify → login → refresh → logout)
3. Découpage des modules NestJS pour Sprint 1
4. Interactions Frontend ↔ Backend ↔ Redis

Contraintes :
- Stack fixée : NestJS + Prisma + PostgreSQL + Redis
- Sécurité : bcrypt, httpOnly cookies, rate limiting
- Pas de sur-ingénierie (MVP)

Soumets tes propositions à Tech Lead Architecture pour validation.
```

### 2A-2 : Data Architect
**Commande :** `/project:data-architect`

```
Data Architect, valide le schéma de données pour Sprint 1.

Schéma proposé dans docs/DATABASE_SCHEMA.md :
- Table users (id, name, email, password, avatar, role, timestamps)
- Table refresh_tokens (id, token, userId, expiresAt, revoked)

Analyse et confirme :
1. Le schéma est-il optimal pour les requêtes Auth ?
2. Les index sont-ils suffisants ?
3. Y a-t-il des problèmes de performance à anticiper ?
4. Recommandations avant migration initiale ?

Soumets ton rapport à Tech Lead Architecture.
```

### 2A-3 : Security Architect
**Commande :** `/project:security-architect`

```
Security Architect, threat model du module Auth Sprint 1.

Features à sécuriser :
- Register (email/password)
- Login (JWT + refresh token)
- Token refresh (rotation)
- Logout (invalidation)

Produis :
1. Threat model STRIDE sur le flux auth complet
2. Vulnérabilités OWASP à adresser (Top 5 prioritaires)
3. Checklist sécurité avant mise en production
4. Recommandations spécifiques (rate limiting, lockout, etc.)

Soumets à Tech Lead Architecture pour validation.
```

### 2A-4 : Tech Lead Architecture — VALIDATION
**Commande :** `/project:tech-lead-archi`

```
Tech Lead Architecture, review et valide le travail des 3 architects pour Sprint 1.

À valider :
1. ADR-001 (Solution Architect) : Architecture Auth
2. Schéma données (Data Architect) : Users + RefreshTokens
3. Threat model (Security Architect) : Sécurité Auth

Pour chaque livrable :
- Approuvé ✅ / Modifications requises ⚠️ / Rejeté ❌
- Commentaires et ajustements si nécessaire

Produis le document final : "Architecture Sprint 1 - Approuvée"
Ce document sera la référence pour tous les devs du sprint.
```

---

## SESSION 2B — Infrastructure & Qualité (Tech Lead Ops)

**En parallèle de 2A (indépendant)**

### DevOps Lead
**Commande :** `/project:devops-lead`

```
DevOps Lead, plan infrastructure pour Sprint 1.

Besoins immédiats :
- Docker Compose local (PostgreSQL + Redis)
- GitHub repository structure (frontend/ + backend/ + bim-service/)
- GitHub Actions CI : lint + tests sur chaque PR

Produis :
1. Structure des dossiers du repository
2. docker-compose.yml pour développement local
3. .env.example (variables nécessaires Sprint 1)
4. GitHub Actions workflow CI (Sprint 1 minimal)

Soumets à Tech Lead Ops pour validation.
```

### QA Lead
**Commande :** `/project:qa-lead`

```
QA Lead, définis la stratégie de tests pour Sprint 1.

Features à tester : Auth complet (register, login, refresh, logout)

Produis :
1. Test plan Sprint 1 (unit + integration + E2E auth)
2. Definition of Done QA (critères de validation)
3. Répartition : QA Engineer vs Test Automation Engineer
4. Test cases critiques (au moins 10)

Soumets à Tech Lead Ops pour validation.
```

### Tech Lead Ops — VALIDATION
**Commande :** `/project:tech-lead-ops`

```
Tech Lead Ops, valide les plans Infrastructure et QA pour Sprint 1.

À valider :
1. Plan DevOps Lead : Docker Compose + CI GitHub Actions
2. Test strategy QA Lead : couverture Sprint 1

Approuve ou ajuste. Produis le go/no-go pour démarrer le sprint.
```

---

## SESSION 3 — Plans d'Implémentation (Tech Lead Dev + Leads)

**Objectif :** Chaque lead produit un plan technique validé avant que ses devs codent.

### Frontend Lead
**Commande :** `/project:frontend-lead`

```
Frontend Lead, plan d'implémentation Frontend Sprint 1.

Architecture validée : voir docs/ARCHITECTURE.md
Guidelines : voir docs/DEV_GUIDELINES.md
API Contracts Auth : voir docs/API_CONTRACTS.md

Sprint 1 Frontend scope :
- Setup Vite + React + TypeScript + Tailwind
- Design tokens + composants de base (Button, Input, Form, Toast)
- Pages : Login, Register, ForgotPassword
- React Query setup + Axios client + React Router

Produis :
1. Structure dossiers frontend (src/)
2. Liste composants à créer Sprint 1
3. Assignment : React Senior vs Frontend Mid
4. Séquence d'implémentation (quoi en premier)
5. Critères de validation avant merge

Soumets à Tech Lead Dev pour validation.
```

### Backend Lead
**Commande :** `/project:backend-lead`

```
Backend Lead, plan d'implémentation Backend Sprint 1.

Architecture Auth validée par Tech Lead Architecture.
Schema BDD validé par Data Architect.

Sprint 1 Backend scope :
- Setup NestJS + Prisma + PostgreSQL + Redis
- Module Auth : register, login, refresh, logout
- Guards + Decorators (@JwtAuth, @User, @Public)
- Rate limiting (5 attempts/min login)
- Swagger setup

Produis :
1. Structure modules NestJS Sprint 1
2. Séquence implémentation (setup → schema → auth module)
3. Assignment : NestJS Senior vs Backend Mid vs API Specialist
4. Points de vigilance sécurité (checker avec Security Architect)

Soumets à Tech Lead Dev pour validation.
```

### BIM Technical Lead
**Commande :** `/project:bim-technical-lead`

```
BIM Technical Lead, plan Sprint 1 pour le BIM Service.

Sprint 1 BIM scope (minimal) :
- Setup FastAPI + Pydantic + IfcOpenShell
- Docker container BIM service
- Health check endpoint uniquement

Le service complet (génération IFC) sera Sprint 3.

Produis :
1. Structure du projet bim-service/
2. Docker configuration
3. Plan de validation (test local du service)

Soumets à Tech Lead Dev pour validation.
```

### Tech Lead Dev — VALIDATION FINALE
**Commande :** `/project:tech-lead-dev`

```
Tech Lead Dev, valide les plans d'implémentation des 3 leads pour Sprint 1.

À valider :
1. Plan Frontend Lead : structure + composants + assignment
2. Plan Backend Lead : modules + séquence + assignment
3. Plan BIM Technical Lead : setup service

Pour chaque plan :
- Approuvé ✅ / Ajustements ⚠️

Produis :
- Sprint 1 backlog officiel (tâches finales avec owners)
- Dépendances entre équipes (qui attend quoi)
- Planning semaine (lundi → vendredi)
- Signal de démarrage : "Sprint 1 peut commencer"
```

---

## Après Session 3 : Les Développeurs Démarrent

Une fois le signal de Tech Lead Dev reçu :

| Équipe | Premier agent | Première tâche |
|--------|--------------|----------------|
| Frontend | React Engineer Senior | Setup Vite + structure projet |
| Backend | NestJS Engineer Senior | Setup NestJS + Prisma + migrations |
| BIM | BIM Technical Lead | Docker + FastAPI skeleton |
| DevOps | DevOps Lead | docker-compose.yml + CI |

**Chaque développeur soumet ses PRs à son Lead pour validation avant merge.**

---

## Checklist Kickoff Complète

```
SESSION 1 — CTO
□ Stack validée (ADR-001 à ADR-004 approuvés)
□ Scope Sprint 1 confirmé (Auth uniquement)
□ Risques identifiés + budget API

SESSION 2A — Architecture
□ ADR-001 Auth produit (Solution Architect)
□ Schéma BDD validé (Data Architect)
□ Threat model Auth produit (Security Architect)
□ Tech Lead Architecture a approuvé les 3 livrables

SESSION 2B — Ops & QA
□ Docker Compose plan produit (DevOps Lead)
□ Test strategy Sprint 1 produite (QA Lead)
□ Tech Lead Ops a validé les 2 plans

SESSION 3 — Plans Dev
□ Plan Frontend validé par Frontend Lead
□ Plan Backend validé par Backend Lead
□ Plan BIM validé par BIM Technical Lead
□ Tech Lead Dev a approuvé tous les plans
□ Sprint 1 backlog officiel publié

DÉMARRAGE DÉVELOPPEMENT
□ Signal de Tech Lead Dev reçu
□ Chaque dev a son plan en main
```
