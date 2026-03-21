# Sprint Plan — BIM AI Assistant

> **Méthodologie :** Agile / Scrum — Sprints de 1 semaine
> **Capacité équipe :** Variable (agents IA à la demande)
> **Objectif :** Livrer le MVP en 5 sprints

---

## Roadmap MVP (5 Sprints)

```
Sprint 1 │ Setup + Auth
Sprint 2 │ Projects CRUD
Sprint 3 │ AI Chat + BIM Generation
Sprint 4 │ 3D Viewer
Sprint 5 │ Intégration + Tests + Polish
         │
         └─► MVP prêt
```

---

## SPRINT 1 — Setup & Auth
**Objectif :** Avoir une application fonctionnelle avec authentification

### Frontend
- [ ] Setup projet Vite + React + TypeScript + Tailwind
- [ ] Structure dossiers (`src/features/`, `shared/`, `layouts/`)
- [ ] Design tokens CSS (couleurs, fonts, spacing)
- [ ] Composants de base : Button, Input, Form, Toast
- [ ] Pages : Login, Register, ForgotPassword
- [ ] React Query setup + Axios client
- [ ] React Router + layouts (AuthLayout, MainLayout)

### Backend
- [ ] Setup NestJS + TypeScript + Prisma
- [ ] Configuration PostgreSQL + migrations initiales
- [ ] Module Auth : register, login, logout
- [ ] JWT access token (15min) + refresh token (7j, httpOnly cookie)
- [ ] Rate limiting (5 attempts/min sur login)
- [ ] Guards + Decorators (@User, @Public)
- [ ] Swagger setup (`/api/docs`)
- [ ] Redis setup (pour refresh tokens blacklist)

### Infrastructure
- [ ] Repo Git initialisé (frontend/ + backend/ + bim-service/)
- [ ] Docker Compose local (postgres, redis)
- [ ] GitHub Actions CI (lint + tests sur PR)
- [ ] Variables d'environnement (.env.example)

**Definition of Done Sprint 1 :**
- [ ] Register → email/password → compte créé
- [ ] Login → JWT reçu → accès dashboard
- [ ] Logout → token invalidé
- [ ] Refresh token → nouvel access token
- [ ] Tests auth : > 80% coverage

---

## SPRINT 2 — Projects CRUD
**Objectif :** Gérer ses projets BIM

### Frontend
- [ ] Dashboard page (liste des projets)
- [ ] ProjectCard composant (name, date, status)
- [ ] Create project modal (form + validation)
- [ ] Edit project modal
- [ ] Delete project (confirmation dialog)
- [ ] Empty state (aucun projet)
- [ ] Loading states + error states

### Backend
- [ ] Module Projects : CRUD complet
- [ ] Prisma schema : Project + BIMModel
- [ ] Endpoints : POST, GET (list), GET (detail), PATCH, DELETE
- [ ] Vérification ownership (user ne peut modifier que ses projets)
- [ ] Pagination (GET list : page, limit)
- [ ] Cache Redis sur GET list (TTL 5min)
- [ ] Tests : controller + service

### BIM Service
- [ ] Setup FastAPI + Pydantic + IfcOpenShell
- [ ] Docker container BIM service
- [ ] Endpoint health check (`GET /health`)

**Definition of Done Sprint 2 :**
- [ ] Créer un projet → apparaît dans dashboard
- [ ] Modifier/supprimer → changements persistés
- [ ] Pagination fonctionnelle (>20 projets)
- [ ] Impossible d'accéder aux projets d'un autre user

---

## SPRINT 3 — AI Chat + BIM Generation
**Objectif :** Générer un modèle BIM via l'IA

### Frontend
- [ ] AI Chat Panel (layout sidebar ou modal)
- [ ] Chat input (textarea + send button)
- [ ] Messages list (user messages + AI responses)
- [ ] Streaming display (texte progressif)
- [ ] Loading state pendant génération
- [ ] Error handling (API error, timeout)

### Backend
- [ ] Module AI : intégration Claude API
- [ ] Endpoint : POST /api/ai/generate (streaming SSE)
- [ ] System prompt BIM (génération JSON valide)
- [ ] Validation JSON retourné par Claude
- [ ] Retry si JSON invalide (max 2 retries)
- [ ] Module BIM : proxy vers BIM Service
- [ ] Endpoint : POST /api/bim/generate

### BIM Service
- [ ] Endpoint : POST /api/bim/generate
  - Input : JSON BIM structure
  - Validation Pydantic (murs ≥0.1m, pièces ≥4m²)
  - Génération IFC (IfcOpenShell)
  - Upload S3 + retour URL signée
- [ ] Endpoint : POST /api/bim/validate (validation seule)
- [ ] Tests : génération IFC valide

**Definition of Done Sprint 3 :**
- [ ] Prompt "Génère une maison 2 chambres" → JSON BIM généré
- [ ] JSON BIM → fichier IFC créé et stocké sur S3
- [ ] Streaming visible dans l'interface
- [ ] Fichier IFC téléchargeable

---

## SPRINT 4 — 3D Viewer
**Objectif :** Visualiser le modèle BIM en 3D

### Frontend
- [ ] ViewerLayout (fullscreen 3D)
- [ ] BIMViewer composant (React-Three-Fiber)
- [ ] Chargement JSON BIM → géométrie Three.js
- [ ] Camera controls (orbit, pan, zoom)
- [ ] Camera presets (Top, Front, Side, Iso)
- [ ] Sélection objet (raycasting → highlight)
- [ ] Properties Panel (affiche infos objet sélectionné)
- [ ] Toolbar (outils : view, select, measure, export)
- [ ] Stats FPS (en développement)
- [ ] Export IFC (téléchargement depuis S3)

**Critères performance :**
- 60 FPS avec 1-100 objets
- 30 FPS avec 1000+ objets
- Contrôles fluides (orbit/pan/zoom sans lag)

**Definition of Done Sprint 4 :**
- [ ] Modèle 3D affiché après génération IA
- [ ] Sélection objet → propriétés affichées
- [ ] Performance : 60 FPS sur machine standard
- [ ] Export IFC fonctionnel

---

## SPRINT 5 — Intégration, Tests & Polish
**Objectif :** MVP prêt pour démo / premiers utilisateurs

### Intégration end-to-end
- [ ] Flux complet : Login → Create Project → AI Chat → 3D View → Export IFC
- [ ] Tests E2E Playwright (flux complet)
- [ ] Tests de performance (API + 3D)

### Polish UI/UX
- [ ] Responsive (mobile + tablet)
- [ ] Animations transitions (page, modal, loader)
- [ ] Messages d'erreur clairs pour chaque cas
- [ ] Onboarding (premier projet : guide utilisateur)

### Production readiness
- [ ] Variables d'environnement production configurées
- [ ] Kubernetes manifests (staging + prod)
- [ ] GitHub Actions CI/CD complet
- [ ] Monitoring Prometheus/Grafana setup
- [ ] Backup PostgreSQL automatique

**Definition of Done Sprint 5 (MVP) :**
- [ ] Flux complet fonctionnel end-to-end
- [ ] E2E tests : 100% pass sur flux critiques
- [ ] Performance : p95 API < 200ms
- [ ] Déployé sur staging
- [ ] 0 bug P0/P1 ouverts

---

## Sprint Courant : SPRINT 1

> **Démarrage :** Dès initialisation des repos
> **Priorité absolue :** Setup + Auth fonctionnel

### Backlog Sprint 1 (ordre de priorité)

| Priorité | Tâche | Assigné à | Statut |
|----------|-------|-----------|--------|
| P0 | Setup projet (Vite + NestJS + Docker Compose) | Tech Lead Dev | TODO |
| P0 | Module Auth backend (register + login + JWT) | NestJS Senior | TODO |
| P0 | Pages Auth frontend (Login + Register) | React Senior | TODO |
| P1 | Prisma schema initial (User) | Data Architect | TODO |
| P1 | GitHub Actions CI setup | DevOps Lead | TODO |
| P1 | Design tokens + composants de base | Lead Designer | TODO |
| P2 | Swagger setup | API Specialist | TODO |
| P2 | Tests auth backend | Test Automation | TODO |

---

## Définition of Done (globale)

Une feature est "done" quand :
1. Code mergé sur `develop` (PR approuvée)
2. Tests passants (coverage > 80%)
3. Swagger documenté (si endpoint API)
4. Déployé sur staging
5. QA Engineer a validé manuellement
