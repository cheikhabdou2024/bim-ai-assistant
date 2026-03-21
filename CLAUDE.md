# BIM AI Assistant — Contexte Projet

## Présentation
**Nom :** BIM AI Assistant
**Type :** Logiciel BIM avec intelligence artificielle
**Marché :** Afrique de l'Ouest (Sénégal, UEMOA)
**Standard :** ESN professionnelle (niveau Atos/Capgemini)

## Stack Technique
- **Frontend :** React + Three.js
- **Backend :** NestJS (Node.js)
- **Base de données :** PostgreSQL + Prisma ORM
- **Cache :** Redis
- **IA :** Claude API (Anthropic)
- **Stockage :** AWS S3
- **Infrastructure :** Kubernetes / Cloud

---

## Équipe IA — 25 Agents Spécialisés

Tu travailles avec une équipe de 25 agents IA organisés en 8 pôles.

### Structure Complète

| Pôle | Agents |
|------|--------|
| Direction Technique | CTO · Tech Lead Architecture · Tech Lead Dev · Tech Lead Ops |
| Architecture | Solution Architect · Enterprise Architect · Data Architect · Security Architect |
| Design | Lead Designer · UI Senior · UI Mid · UX Researcher |
| Frontend | Frontend Lead · React Senior · Three.js Specialist · Frontend Mid |
| Backend | Backend Lead · NestJS Senior · API Specialist · Backend Mid |
| BIM & IA | BIM Technical Lead · IA/ML Engineer · Data Engineer |
| QA | QA Lead · QA Engineer · Test Automation Engineer |
| DevOps | DevOps Lead · Cloud Engineer · SRE |

---

## Comment Appeler un Agent

Utilise les commandes `/project:` pour activer un agent spécifique.

### Agents Disponibles

**Direction :**
- `/project:cto` → Décisions stratégiques, vision 3-5 ans
- `/project:tech-lead-archi` → Coordination architecture
- `/project:tech-lead-dev` → Coordination développement
- `/project:tech-lead-ops` → Infrastructure, CI/CD, qualité

**Architecture :**
- `/project:solution-architect` → Architecture applicative, ADR, C4
- `/project:enterprise-architect` → Vision long-terme, expansion
- `/project:data-architect` → Modélisation données, performance DB
- `/project:security-architect` → Sécurité, OWASP, RGPD

**Design :**
- `/project:lead-designer` → Direction artistique, design system
- `/project:ui-designer-senior` → UI complexe, composants, prototypes
- `/project:ui-designer-mid` → Pages simples, forms, assets
- `/project:ux-researcher` → Tests utilisateurs, analytics, SUS

**Frontend :**
- `/project:frontend-lead` → Architecture React, code review, sprint planning
- `/project:react-engineer-senior` → Features complexes, performance, data grids
- `/project:threejs-specialist` → Viewer 3D, WebGL, interactions spatiales
- `/project:frontend-engineer-mid` → Pages simples, forms, intégrations API

**Backend :**
- `/project:backend-lead` → Architecture NestJS, sprint planning backend
- `/project:nestjs-engineer-senior` → Auth, WebSocket, modules core
- `/project:api-specialist` → REST endpoints, Swagger, rate limiting
- `/project:backend-engineer-mid` → CRUD, background jobs, emails

**BIM & IA :**
- `/project:bim-technical-lead` → Service Python, génération IFC, validation BIM
- `/project:ia-ml-engineer` → Claude API, prompt engineering, streaming
- `/project:data-engineer` → Redis caching, queries Prisma, pipelines

**QA :**
- `/project:qa-lead` → Stratégie tests, test plan, quality gates
- `/project:qa-engineer` → Tests manuels, bug reports, UAT
- `/project:test-automation-engineer` → E2E Playwright, API tests, performance

**DevOps :**
- `/project:devops-lead` → CI/CD GitHub Actions, Kubernetes, monitoring

---

## Documents de Référence

### Lire en priorité avant de travailler
| Document | Contenu | À lire par |
|----------|---------|-----------|
| `docs/ARCHITECTURE.md` | Stack, services, ADR, flux de données | Tous |
| `docs/DEV_GUIDELINES.md` | Conventions code, patterns, tests | Dev + QA |
| `docs/SPRINT_PLAN.md` | Roadmap MVP, sprint courant, backlog | Tous |
| `docs/API_CONTRACTS.md` | Endpoints, formats request/response | Frontend + Backend |
| `docs/DATABASE_SCHEMA.md` | Schéma Prisma, index, relations | Backend + Data |

### Référence équipe
- `4.EQUIPE_COMPLETE_25_AGENTS_IA.md` — Profils des agents
- `5.GUIDE_PRATIQUE_UTILISATION_AGENTS.md` — Guide d'utilisation

---

## Principe de Gouvernance ESN

**PRODUIRE → SOUMETTRE → VALIDER → IMPLÉMENTER**

Personne ne code avant que son Lead ait validé l'approche.

| Niveau | Qui valide | Ce qu'il valide |
|--------|-----------|-----------------|
| Stratégique | CTO | Stack, budget, scope |
| Architecture | Tech Lead Archi | ADR, schéma, sécurité |
| Implémentation | Tech Lead Dev | Plans techniques des Leads |
| Équipe | Leads (Front/Back/BIM) | Code de leurs devs |
| Ops & Qualité | Tech Lead Ops | CI/CD, releases, go/no-go prod |

**Voir `docs/GOVERNANCE.md` pour les règles complètes.**
**Voir `docs/SPRINT1_KICKOFF.md` pour l'ordre de démarrage Sprint 1.**

## Ordre de passage des agents (par session)

```
Session 1 : /project:cto
Session 2 : /project:solution-architect → /project:data-architect
            → /project:security-architect → /project:tech-lead-archi (valide)
            (en parallèle) /project:devops-lead → /project:qa-lead
            → /project:tech-lead-ops (valide)
Session 3 : /project:frontend-lead → /project:backend-lead
            → /project:bim-technical-lead → /project:tech-lead-dev (valide)
Ensuite   : Développeurs (React Senior, NestJS Senior, etc.)
```
