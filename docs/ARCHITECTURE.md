# Architecture — BIM AI Assistant

> **Statut :** MVP en développement
> **Version :** 1.0
> **Dernière mise à jour :** 2026-03-19

---

## Vue d'ensemble

BIM AI Assistant est une application web qui permet aux architectes et ingénieurs de générer, visualiser et exporter des modèles BIM (IFC) via une interface de chat IA.

```
┌─────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                          │
│              (Architecte / Ingénieur / Étudiant)            │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth UI  │  │  AI Chat UI  │  │   3D Viewer (R3F)    │  │
│  └──────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Projects Dashboard UI                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API + SSE (streaming)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (NestJS)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   Auth   │  │ Projects │  │    AI    │  │    BIM    │  │
│  │  Module  │  │  Module  │  │  Module  │  │  Module   │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  PostgreSQL (Prisma) │  │       Redis (Cache)          │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└──────────┬──────────────────────────┬───────────────────────┘
           │ HTTP interne             │ SDK
           ▼                         ▼
┌──────────────────────┐   ┌─────────────────────┐
│  BIM Service (Python)│   │   Claude API        │
│  FastAPI + IFCOpen   │   │   (Anthropic)       │
│  Shell               │   │                     │
└──────────────────────┘   └─────────────────────┘
           │
           ▼
┌──────────────────────┐
│   AWS S3             │
│   (Fichiers IFC)     │
└──────────────────────┘
```

---

## Stack Technique

### Frontend
| Technologie | Rôle | Version cible |
|-------------|------|---------------|
| React | Framework UI | 18+ |
| TypeScript | Typage | 5+ (strict) |
| React-Three-Fiber | 3D Viewer | 8+ |
| Three.js | Moteur 3D | 0.165+ |
| Drei | Helpers R3F | 9+ |
| TanStack Query | Data fetching | 5+ |
| TanStack Table | Data grids | 8+ |
| React Hook Form | Formulaires | 7+ |
| Zod | Validation | 3+ |
| Zustand | State global | 4+ |
| Tailwind CSS | Styles | 3+ |
| Vite | Build tool | 5+ |
| Vitest | Tests | 1+ |
| Playwright | E2E tests | 1.40+ |

### Backend
| Technologie | Rôle | Version cible |
|-------------|------|---------------|
| NestJS | Framework API | 10+ |
| TypeScript | Typage | 5+ (strict) |
| Prisma | ORM | 5+ |
| PostgreSQL | Base de données | 15+ |
| Redis | Cache + Queue | 7+ |
| Bull | Background jobs | 4+ |
| Passport.js | Auth strategies | - |
| JWT | Tokens | - |
| class-validator | Validation DTOs | - |
| Swagger/OpenAPI | Documentation API | - |
| Jest | Tests | 29+ |
| Supertest | Tests API | - |

### BIM Service
| Technologie | Rôle |
|-------------|------|
| Python 3.11+ | Runtime |
| FastAPI | API framework |
| IfcOpenShell 0.8+ | Génération/parsing IFC |
| Pydantic v2 | Validation données |
| Uvicorn | ASGI server |

### Infrastructure
| Service | Rôle |
|---------|------|
| AWS EKS | Kubernetes managed |
| AWS S3 | Stockage fichiers IFC |
| AWS RDS | PostgreSQL managed |
| AWS ElastiCache | Redis managed |
| GitHub Actions | CI/CD |
| GitHub Container Registry | Images Docker |
| Prometheus + Grafana | Monitoring |

---

## Architecture des modules NestJS

```
backend/src/modules/
├── auth/          ← Login, Register, JWT, Refresh tokens
├── users/         ← Profil, avatar, préférences
├── projects/      ← CRUD projets BIM
├── ai/            ← Intégration Claude API, streaming
└── bim/           ← Proxy vers BIM Service Python, upload IFC
```

**Règle stricte :** Chaque module suit le pattern :
`Controller` → `Service` → `PrismaService`
Jamais de logique métier dans les controllers.

---

## Flux de données — Génération BIM

```
1. User écrit prompt dans AI Chat
2. Frontend → POST /api/ai/generate (prompt)
3. Backend AIModule → Claude API (streaming SSE)
4. Claude retourne JSON BIM (structure validée)
5. Backend → POST http://bim-service/generate (JSON)
6. BIM Service → IfcOpenShell → fichier .ifc
7. BIM Service → upload S3 → retourne URL signée
8. Backend → Frontend (URL + metadata)
9. Frontend charge 3D Viewer avec le modèle
```

---

## Décisions Architecture (ADR)

### ADR-001 : Monolithe modulaire NestJS vs Microservices
**Décision :** Monolithe modulaire
**Raison :** Équipe petite, MVP, complexité maîtrisée. Migration microservices possible à 10K users.

### ADR-002 : BIM Service Python séparé
**Décision :** Service Python indépendant (FastAPI)
**Raison :** IfcOpenShell est Python-only. Communication HTTP interne.

### ADR-003 : Streaming SSE pour AI Chat
**Décision :** Server-Sent Events (SSE)
**Raison :** Unidirectionnel (server → client), plus simple que WebSocket pour ce use case.

### ADR-004 : React-Three-Fiber pour le viewer 3D
**Décision :** R3F + Drei
**Raison :** Intégration React native, ecosystem riche, performances validées (Test 3 OK).

---

## Environnements

| Env | URL | Branch | Deploy |
|-----|-----|--------|--------|
| Development | localhost | feature/* | Manuel |
| Staging | staging.bim-ai.app | develop | Auto (push) |
| Production | app.bim-ai.app | main | Manuel (approval) |
