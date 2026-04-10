# PROJECT STATE — BIM AI Assistant
# État Live du Projet (Mis à jour après chaque session)

> **RÈGLE :** Ce fichier est mis à jour à la fin de chaque session de travail.
> Il reflète l'état ACTUEL du projet à tout moment.

---

## ÉTAT GÉNÉRAL

| Attribut | Valeur |
|----------|--------|
| Date de mise à jour | 2026-04-10 |
| Sprint courant | **SPRINT 4 — 3D Viewer + IFC Geometry** (kickoff) |
| Phase | Sprint 3 livré ✅ — Staging opérationnel → Sprint 4 kickoff |
| % code implémenté | Auth 100% ✅ — Projects 100% ✅ — AI Chat 100% ✅ — BIM Generate 100% ✅ — 3D Viewer 0% ⬜ |
| Prochaine étape | Session 1 CTO Sprint 4 |
| Bloqueur actuel | ALB idle_timeout à vérifier (P2 — non bloquant staging) |

---

## SPRINT 1 — AVANCEMENT

### Validation Chain Status — Sprint 1 (TERMINÉ)
```
[✅] SESSION 1  — CTO Validation              (2026-03-19)
[✅] SESSION 2A — Architecture Review         (2026-03-20)
[✅] SESSION 2B — Ops & QA Planning           (2026-03-20)
[✅] SESSION 3  — Implementation Plans        (2026-03-20)
[✅] DÉVELOPPEMENT — Sprint 1 code            (TERMINÉ 2026-03-21)
[✅] DÉPLOIEMENT — Staging AWS opérationnel   (2026-04-05)
[✅] QA LEAD — Go/No-Go Staging               (2026-04-05) — NPS 8/10
```

### Validation Chain Status — Sprint 2 (TERMINÉ ✅)
```
[✅] SESSION 1  — CTO Validation Sprint 2        (2026-04-05)
[✅] SESSION 2A — Architecture Review             (2026-04-05)
[✅] SESSION 2B — Ops & QA Planning               (2026-04-05)
[✅] SESSION 3  — Plans Dev                        (2026-04-05)
[✅] DÉVELOPPEMENT — Sprint 2 code
[✅] DÉPLOIEMENT — Staging Sprint 2               (2026-04-05)
[✅] QA LEAD — Go/No-Go Sprint 2                  (2026-04-06) — NPS 9/10
```

### Validation Chain Status — Sprint 3 (TERMINÉ ✅)
```
[✅] SESSION 1  — CTO Validation Sprint 3        (2026-04-06)
[✅] SESSION 2A — Architecture Review             (2026-04-10) — ADR-009→012
[✅] SESSION 2B — Ops & QA Planning               (2026-04-10) — mock Claude + moto
[✅] SESSION 3  — Plans Dev                        (2026-04-10)
[✅] DÉVELOPPEMENT — Sprint 3 VAGUE 1→5           (2026-04-10) — 5 commits
[✅] DÉPLOIEMENT — Staging Sprint 3               (2026-04-10)
[✅] QA LEAD — Go/No-Go Sprint 3                  (2026-04-10) — NPS 9/10
```

## STAGING AWS — ÉTAT ACTUEL
| Ressource | URL | Statut |
|-----------|-----|--------|
| Frontend | https://d3gw434i545gh6.cloudfront.net | ✅ LIVE |
| API | http://bim-ai-staging-alb-1151669089.eu-west-1.elb.amazonaws.com/api | ✅ LIVE |
| BIM Service | /bim/* via ALB | ✅ LIVE — `{"status":"ok","ifcopenshell_version":"0.8.4"}` |
| ECS Backend | 2/2 tasks HEALTHY | ✅ |
| ECS BIM | 1/1 task RUNNING | ✅ routé ALB (2026-04-05) |

### Tâches Backend
| Tâche | Assigné | Statut |
|-------|---------|--------|
| BE-01 Setup NestJS + config + Redis + Pino | NestJS Senior | ✅ MERGÉ |
| BE-02 Prisma schema + seed | NestJS Senior | ✅ MERGÉ |
| BE-03 UsersService | NestJS Senior | ✅ MERGÉ |
| BE-04 AuthService register + login | NestJS Senior | ✅ MERGÉ |
| BE-05 JWT Strategy + Guards + Decorators | NestJS Senior | ✅ MERGÉ |
| BE-06 AuthService refresh + logout + Reuse Detection | NestJS Senior | ✅ MERGÉ |
| BE-07 AuthController | NestJS Senior | ✅ MERGÉ |
| BE-08 ThrottlerGuard integration test | API Specialist | ⬜ Semaine 2 |
| BE-09 UsersController (GET/PATCH /me) | API Specialist | ⬜ Semaine 2 |
| BE-10 Swagger (@ApiTags, /api/docs) | API Specialist | ⬜ Semaine 2 |
| BE-11 Integration tests Supertest (TC-020→035) | NestJS Senior | ✅ MERGÉ |
| BE-12 CORS + Helmet validation + Postman collection | Backend Mid | ⬜ Semaine 2 |
| BE-13 Health endpoint (GET /api/health) | NestJS Senior | ✅ MERGÉ |

### Tâches Frontend
| Tâche | Assigné | Statut |
|-------|---------|--------|
| FE-01 Setup Vite + TS + Tailwind | React Senior | ✅ MERGÉ |
| FE-02 auth.store.ts (Zustand) + query-client | React Senior | ✅ MERGÉ |
| FE-03 axios.client.ts + interceptor 401 + queue | React Senior | ✅ MERGÉ |
| FE-04 Button + Input + Spinner | React Senior | ✅ MERGÉ |
| FE-05 Toast + useToast + ErrorBoundary | React Senior | ✅ MERGÉ |
| FE-06 FormField + PasswordStrengthBar | Frontend Mid | ✅ MERGÉ |
| FE-07 auth.api.ts + useLogin + useRegister + useLogout | React Senior | ✅ MERGÉ |
| FE-08 AuthLayout + AppLayout | React Senior | ✅ MERGÉ |
| FE-09 RegisterForm + Pages Login/Register + DashboardPage | Frontend Mid | ✅ MERGÉ |
| FE-10 router + ProtectedRoute + SilentRefreshProvider | React Senior | ✅ MERGÉ |
| FE-11 E2E Playwright (4 scénarios QA Lead) | Test Automation | ✅ MERGÉ |

### Tâches Infrastructure
| Tâche | Assigné | Statut |
|-------|---------|--------|
| Repo Git (frontend/ + backend/ + bim-service/) | DevOps Lead | ✅ FAIT |
| Docker Compose (postgres + redis + bim profile) | DevOps Lead | ✅ FAIT |
| GitHub Actions CI (backend + frontend + bim + e2e) | DevOps Lead | ✅ FAIT |
| Makefile (developer commands) | DevOps Lead | ✅ FAIT |
| .env.example | DevOps Lead | ✅ FAIT |

### BIM Service
| Tâche | Assigné | Statut |
|-------|---------|--------|
| BIM-01 Structure + main.py + health.py + config.py | BIM Tech Lead | ✅ MERGÉ |
| BIM-02 requirements.txt + Dockerfile multi-stage | BIM Tech Lead | ✅ MERGÉ |
| BIM-03 5 tests pytest (health + smoke IFC) | BIM Tech Lead | ✅ MERGÉ |
| BIM-04 Validation 3 étapes documentée | BIM Tech Lead | ✅ MERGÉ |

### Tâches Sprint 2 — Backend
| ID | Tâche | Assigné | Statut |
|----|-------|---------|--------|
| BE-S2-01 | Prisma schema Project + migration + Dockerfile CMD | NestJS Senior | ⬜ |
| BE-S2-02 | Seed update (3 projets/user) | Data Engineer | ⬜ |
| BE-S2-03 | Redis SCAN cache helper (common/redis/) | Data Engineer | ⬜ |
| BE-S2-04 | ProjectsService (CRUD + ownership + pagination + cache) | NestJS Senior | ⬜ |
| BE-S2-05 | ProjectsController (5 endpoints + DTOs + Throttle + Swagger) | API Specialist | ⬜ |
| BE-S2-06 | Integration tests TC-036→TC-050 | NestJS Senior | ⬜ |
| BE-S2-07 | UsersController GET + PATCH /api/users/me (backlog BE-09) | API Specialist | ⬜ |
| BE-S2-08 | Swagger complet /api/docs (backlog BE-10) | API Specialist | ⬜ |
| BE-S2-09 | Fix TC-027 rate-limit test stable (backlog) | NestJS Senior | ⬜ |
| BE-S2-10 | Cron nettoyage tokens expirés (backlog DATA-01) | Data Engineer | ⬜ |
| BE-S2-11 | CORS + Helmet final + Postman (backlog BE-12) | Backend Mid | ⬜ |

### Tâches Sprint 2 — Frontend
| ID | Tâche | Assigné | Statut |
|----|-------|---------|--------|
| FE-S2-01 | project.types.ts | React Senior | ⬜ |
| FE-S2-02 | projects.api.ts | React Senior | ⬜ |
| FE-S2-03 | useProjects + useMutation hooks | React Senior | ⬜ |
| FE-S2-04 | ProjectCard.tsx | Frontend Mid | ⬜ |
| FE-S2-05 | ProjectList.tsx (empty state + loading) | Frontend Mid | ⬜ |
| FE-S2-06 | CreateProjectModal + EditProjectModal | Frontend Mid | ⬜ |
| FE-S2-07 | DeleteProjectModal | Frontend Mid | ⬜ |
| FE-S2-08 | DashboardPage refonte complète | React Senior | ⬜ |
| FE-S2-09 | E2E Playwright TC-E2E-012→016 | Test Automation | ⬜ |

### Tâches Sprint 2 — BIM / Infra
| ID | Tâche | Assigné | Statut |
|----|-------|---------|--------|
| BIM-S2-01 | terraform apply BIM ALB routing | DevOps Lead | ⬜ |
| BIM-S2-02 | ForgotPassword hidden (UAT-002) | Frontend Mid | ⬜ |

---

## TESTS TECHNIQUES

| Test | Résultat | Action requise |
|------|----------|----------------|
| Test 1 — Claude API | ❌ FAIL — crédits insuffisants | Recharger $10 sur console.anthropic.com |
| Test 2 — IfcOpenShell 0.8.4 | ✅ PASS — IFC4 généré | Aucune |
| Test 3 — Three.js R3F | ✅ PASS — Viewer fonctionnel | Aucune |

---

## INFRASTRUCTURE EXISTANTE

### Fichiers créés
```
C:\Users\abdou\Desktop\Bim AI assisstant\
├── CLAUDE.md                    ✅
├── CTO_BRIEFING.md              ✅
├── Makefile                     ✅ (make help pour voir les commandes)
├── docker-compose.yml           ✅ (postgres + redis + bim [profile:bim])
├── .env.example                 ✅
├── .github/
│   └── workflows/
│       ├── ci-backend.yml       ✅ (lint + unit + integration + build)
│       ├── ci-frontend.yml      ✅ (lint + tsc + build)
│       ├── ci-bim.yml           ✅ (pytest + docker build)
│       └── e2e.yml              ✅ (Playwright E2E)
├── docs/
│   ├── ARCHITECTURE.md          ✅
│   ├── API_CONTRACTS.md         ✅
│   ├── DATABASE_SCHEMA.md       ✅
│   ├── DEV_GUIDELINES.md        ✅
│   ├── GOVERNANCE.md            ✅
│   ├── SPRINT1_KICKOFF.md       ✅
│   ├── SPRINT_PLAN.md           ✅
│   ├── PROJECT_STATE.md         ✅ (ce fichier)
│   └── DECISIONS_LOG.md         ✅
├── backend/
│   ├── prisma/schema.prisma     ✅
│   ├── src/
│   │   ├── app.module.ts        ✅
│   │   ├── main.ts              ✅
│   │   ├── config/              ✅
│   │   ├── common/              ✅ (redis, filters, utils, health)
│   │   ├── prisma/              ✅
│   │   └── modules/auth/        ✅ (service + controller + strategy + guards + dto)
│   └── test/auth.e2e-spec.ts    ✅ (TC-020→TC-035)
├── frontend/
│   └── src/
│       ├── features/auth/       ✅ (store, api, hooks, components)
│       ├── shared/              ✅ (axios, query-client, ui components)
│       ├── layouts/             ✅
│       ├── pages/               ✅
│       └── router/              ✅
├── bim-service/
│   ├── main.py                  ✅
│   ├── app/ (health, config)    ✅
│   ├── requirements.txt         ✅
│   └── Dockerfile               ✅ (multi-stage, non-root)
└── e2e/
    ├── playwright.config.ts     ✅
    ├── package.json             ✅
    └── auth/                    ✅ (4 spec files, 11 test cases)
        ├── e2e-001-register-login.spec.ts
        ├── e2e-002-logout.spec.ts
        ├── e2e-003-silent-refresh.spec.ts
        └── e2e-004-rate-limiting.spec.ts
```

---

## DÉCISIONS TECHNIQUES SPRINT 1

| Décision | Raison |
|----------|--------|
| Opaque refresh token (crypto.randomBytes) — pas JWT | JWT serait décodable, exposerait userId. Hash SHA-256 en DB. |
| `Logger` NestJS natif — pas `@InjectPinoLogger` | `nestjs-pino` nécessite `LoggerModule.forFeature()` par module. Complexity inutile Sprint 1. |
| `useAuthStore.getState()` dans useSilentRefresh | Évite cycle React hooks. Pas de reactivity nécessaire à ce point. |
| `isInitialized` dans Zustand store | Prévient le flash redirect vers /login au rechargement de page. |
| `@@index([userId, revoked])` composite — pas double index | Optimisé pour la requête logout (WHERE userId AND revoked=false). |
| Profile `bim` dans docker-compose | BIM service non requis par backend en Sprint 1. `docker compose up -d` ne le démarre pas. |

---

## BLOQUEURS ACTUELS

### P2 (non bloquant staging, bloquant prod)
- **ALB idle_timeout** : vérifier >= 300s dans infra/alb.tf pour SSE /chat/stream (streams longs coupés sinon)

### INFO
- **TC-E2E-018→022** (Playwright chat) : déférés Sprint 3, à exécuter Sprint 4
- **IFC 3D Geometry** : Sprint 3 génère la structure IFC sans géométrie 3D (walls/slabs) → Sprint 4

---

## PROCHAINES ACTIONS (PAR PRIORITÉ)

1. **[P2 - PRÉ-PROD]** ALB idle_timeout → vérifier + corriger dans infra/alb.tf
2. **[SPRINT 4 - KICKOFF]** Session 1 CTO Sprint 4 (scope : 3D Viewer + IFC Geometry)
3. **[SPRINT 4]** TC-E2E-018→022 Playwright chat panel
4. **[SPRINT 4]** IFC IfcExtrudedAreaSolid (walls + slabs + geometry)

---

## HISTORIQUE DES SESSIONS

| Date | Session | Résultat |
|------|---------|----------|
| 2026-03-19 | Setup équipe (27 agents) | ✅ Complété |
| 2026-03-19 | Tests techniques (3 tests) | ✅ 2/3 PASS (Test 1 en attente crédits) |
| 2026-03-19 | Création docs essentiels (7 docs) | ✅ Complété |
| 2026-03-19 | Gouvernance + SPRINT1_KICKOFF | ✅ Complété |
| 2026-03-19 | SESSION 1 — CTO Validation | ✅ Stack + scope approuvés |
| 2026-03-19 | Système passation (CTO_BRIEFING + états) | ✅ Complété |
| 2026-03-20 | SESSION 2A — Architecture Review | ✅ ADR-001, schéma BDD, threat model approuvés |
| 2026-03-20 | SESSION 2B — Ops & QA Planning | ✅ Docker Compose, CI, test strategy approuvés |
| 2026-03-20 | SESSION 3 — Plans d'implémentation | ✅ Frontend + Backend + BIM plans validés |
| 2026-03-20 | Signal de démarrage Sprint 1 | ✅ Émis par Tech Lead Dev |
| 2026-03-20 | Backend Auth Core mergé sur develop | ✅ Coverage 91% — feature/AUTH-05 |
| 2026-03-20 | Frontend Sprint 1 100% mergé sur develop | ✅ FE-01 à FE-10 complets |
| 2026-03-20 | BIM Service setup complet | ✅ BIM-01 à BIM-04 — health check OK |
| 2026-03-20 | QA Lead : Go/No-Go Sprint 1 | ✅ GO — NPS 8/10 — 0 bug P0/P1 |
| 2026-03-20 | **SPRINT 1 OFFICIELLEMENT TERMINÉ** | ✅ Sprint Goal atteint |
| 2026-03-21 | DevOps Lead : Infrastructure finale | ✅ CI 4 workflows + Makefile + E2E setup + health endpoint |
| 2026-04-04 | DevOps Lead : Patch Terraform staging | ✅ HTTP-only (no ACM/domain) + account ID 557211737343 + backend_count=1 |
| 2026-04-05 | SESSION 1 Sprint 2 — CTO Validation | ✅ Scope Projects CRUD validé + décisions DEC-S2-01→05 |
| 2026-04-05 | SESSION 2A Sprint 2 — Architecture Review | ✅ ADR-005→008 + schema Prisma + DTOs + cache SCAN pattern |
| 2026-04-05 | SESSION 2B Sprint 2 — Ops & QA Planning | ✅ Migration Dockerfile startup · QA TC-036→050 · E2E TC-E2E-012→016 |
| 2026-04-05 | SESSION 3 Sprint 2 — Plans Implémentation | ✅ 20 tâches planifiées · 6 vagues · signal GO émis |
| 2026-04-05 | DÉVELOPPEMENT Sprint 2 — VAGUE 1 | ✅ Projects CRUD + Redis cache + migrations + modals + DashboardPage |
| 2026-04-05 | DÉPLOIEMENT Sprint 2 — Staging AWS | ✅ commit cc8c6b9 · cd-staging.yml · BIM ALB opérationnel |
| 2026-04-06 | QA Lead Go/No-Go Sprint 2 | ✅ GO — NPS 9/10 — 0 bug P0/P1 |
| 2026-04-06 | **SPRINT 2 OFFICIELLEMENT TERMINÉ** | ✅ Projects CRUD live sur staging |
| 2026-04-06 | SESSION 1 Sprint 3 — CTO Validation | ✅ ADR-009→012 · SSE via POST · S3 · Secrets Manager |
| 2026-04-10 | SESSION 2A Sprint 3 — Architecture Review | ✅ ADR-009 SSE · ADR-010 ReadableStream · ADR-011 bimData DB · ADR-012 API Key |
| 2026-04-10 | SESSION 2B Sprint 3 — Ops & QA Planning | ✅ mock Claude CI · moto[s3] · infra secrets bim-service |
| 2026-04-10 | SESSION 3 Sprint 3 — Plans Leads | ✅ Backend + Frontend + BIM plans validés par Tech Lead Dev |
| 2026-04-10 | DÉVELOPPEMENT Sprint 3 — VAGUE 1 | ✅ Prisma schema (Conversation+Message) · /validate · chat.types.ts |
| 2026-04-10 | DÉVELOPPEMENT Sprint 3 — VAGUE 2 | ✅ AIService SDK · /generate IFC+S3 · chat.api.ts · bim.api.ts |
| 2026-04-10 | DÉVELOPPEMENT Sprint 3 — VAGUE 3 | ✅ AIChatController SSE · BIMProxy · ConversationsService · useStreamChat |
| 2026-04-10 | DÉVELOPPEMENT Sprint 3 — VAGUE 4 | ✅ AIChatPanel · BIMPreviewCard · ConversationList · ChatPage · Router |
| 2026-04-10 | DÉVELOPPEMENT Sprint 3 — VAGUE 5 | ✅ Tests TC-046→060 · TC-PY-001→008 · CI ANTHROPIC_API_KEY · infra ecs.tf |
| 2026-04-10 | DÉPLOIEMENT Sprint 3 — Staging AWS | ✅ terraform apply (secrets+task def) · migration add_ai_chat |
| 2026-04-10 | QA Lead Go/No-Go Sprint 3 | ✅ GO — NPS 9/10 — 0 bug P0/P1 |
| 2026-04-10 | **SPRINT 3 OFFICIELLEMENT TERMINÉ** | ✅ AI Chat + BIM Generation live sur staging |

---

## COMMENT METTRE À JOUR CE FICHIER

À la fin de chaque session de travail, mettre à jour :
1. La date de mise à jour
2. L'état des cases (⬜ TODO / 🔄 IN PROGRESS / ✅ DONE / ❌ BLOCKED)
3. Les bloqueurs actuels
4. Le tableau "Historique des sessions"
5. Les prochaines actions
