# CTO BRIEFING — BIM AI Assistant
# Document de Passation — Lecture Obligatoire en Début de Session

> **Usage :** Ce fichier est LA référence unique pour tout nouveau contexte CTO.
> Lis ce fichier ENTIÈREMENT avant de prendre la moindre décision.
> **Dernière mise à jour :** 2026-03-20 (Sprint 1 démarré — signal Tech Lead Dev reçu)

---

## 1. IDENTITÉ DU PROJET

**Nom :** BIM AI Assistant
**Vision :** Permettre à tout architecte/ingénieur africain de générer, visualiser et exporter
des maquettes BIM (fichiers IFC) via une conversation en langage naturel avec une IA.
**Marché cible :** Sénégal → UEMOA → Afrique francophone
**Statut :** Sprint 1 — DÉVELOPPEMENT EN COURS (signal émis 2026-03-20)
**Code écrit :** 0% (premiers commits attendus aujourd'hui)

---

## 2. STACK TECHNIQUE (VALIDÉE PAR CTO — 2026-03-19)

| Couche | Technologie | Version | Statut |
|--------|-------------|---------|--------|
| Frontend | React + Vite + TypeScript | React 18 | ADR-001 ✅ |
| 3D | React-Three-Fiber + Drei | Latest | ADR-001 ✅ |
| Styling | Tailwind CSS | v3 | ADR-001 ✅ |
| Backend | NestJS + TypeScript | v10 | ADR-002 ✅ |
| ORM | Prisma | v5 | ADR-002 ✅ |
| Base de données | PostgreSQL | v15+ | ADR-003 ✅ |
| Cache | Redis | v7 | ADR-003 ✅ |
| BIM Service | Python FastAPI + IfcOpenShell | 0.8.4 | ADR-004 ✅ |
| IA | Claude API (claude-sonnet-4-20250514) | Latest | ADR-004 ✅ |

**RÈGLE ABSOLUE :** Aucun changement de stack sans décision CTO + ADR documenté.

---

## 3. ARCHITECTURE MACRO

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEUR                          │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              FRONTEND (React + Vite)                    │
│  Login/Register | Dashboard | AI Chat | 3D Viewer       │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API + SSE
┌─────────────────────▼───────────────────────────────────┐
│              BACKEND (NestJS)                           │
│  Auth Module | Projects Module | AI Module | BIM Module │
├─────────────┬───────────────────┬───────────────────────┤
│  PostgreSQL │      Redis        │    Claude API         │
│  (données) │ (cache/tokens)    │ (génération BIM)      │
└─────────────┴─────────┬─────────┴───────────────────────┘
                         │ HTTP interne
              ┌──────────▼──────────┐
              │   BIM SERVICE       │
              │   (Python FastAPI)  │
              │   IfcOpenShell 0.8.4│
              │   → génère .ifc     │
              └─────────────────────┘
```

**Détail complet :** `docs/ARCHITECTURE.md`

---

## 4. MVP SCOPE — 5 SPRINTS

```
Sprint 1 │ Setup + Auth                    ← EN COURS (planification)
Sprint 2 │ Projects CRUD
Sprint 3 │ AI Chat + BIM Generation
Sprint 4 │ 3D Viewer (React-Three-Fiber)
Sprint 5 │ Intégration + Tests + Polish
          └─► MVP LIVRÉ
```

**Sprint 1 objectif :** Application fonctionnelle avec authentification complète.
- Register → Login → JWT (15min) + Refresh Token (7j httpOnly cookie)
- Rate limiting : 5 tentatives/min sur login
- Guards NestJS : @JwtAuth, @User, @Public
- ForgotPassword : reporté à P2 (décision CTO)

**Détail complet :** `docs/SPRINT_PLAN.md`

---

## 5. DÉCISIONS CTO PRISES (SESSION 1 — 2026-03-19)

### ADRs Approuvés
| ADR | Sujet | Décision |
|-----|-------|----------|
| ADR-001 | Frontend Stack | React 18 + Vite + TypeScript + Tailwind + R3F ✅ |
| ADR-002 | Backend Stack | NestJS 10 + Prisma + JWT httpOnly cookies ✅ |
| ADR-003 | Data Stack | PostgreSQL 15 + Redis 7 ✅ |
| ADR-004 | IA + BIM | Claude API sonnet-4 + IfcOpenShell 0.8.4 ✅ |

### Ajustements CTO
- **ForgotPassword** : Déplacé de P0 → P2 (ne bloque pas le MVP Auth core)
- **Scope Sprint 1** : Auth uniquement (pas de Projects CRUD en Sprint 1)

### Risques Identifiés et Mitigations
| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Crédits Anthropic épuisés | CRITIQUE | Ajouter $10 sur console.anthropic.com AVANT de continuer |
| JWT + httpOnly cookies sur Windows dev | MOYEN | Tester CORS + SameSite=None en local |
| Scope creep Sprint 1 | MOYEN | Bloquer toute feature non-Auth |
| Docker Desktop sur Windows | FAIBLE | WSL2 activé, Docker Desktop installé |

### Budget Approuvé
- **Anthropic API :** $10 pour les tests et le développement Sprint 1
- **Action requise :** Recharger le compte sur console.anthropic.com

---

## 6. ÉTAT DES TESTS TECHNIQUES

| Test | Outil | Résultat | Note |
|------|-------|----------|------|
| Test 1 — Claude API | Node.js + @anthropic-ai/sdk | ❌ FAIL | Crédits insuffisants → recharger $10 |
| Test 2 — IfcOpenShell | Python 3.14.3 | ✅ PASS | IFC4 généré (595 bytes) |
| Test 3 — Three.js R3F | Vite + React-Three-Fiber | ✅ PASS | 3D viewer fonctionnel sur port 5173 |

**Fix IfcOpenShell 0.8.4 (IMPORTANT) :**
```python
# ANCIEN (ne fonctionne plus) :
ifcopenshell.api.run("aggregate.assign_object", ifc, product=site, relating_object=project)

# CORRECT v0.8.4 :
ifcopenshell.api.run("aggregate.assign_object", ifc, products=[site], relating_object=project)
# Le paramètre s'appelle 'products' (pluriel) et prend une liste
```

---

## 7. ENVIRONNEMENT DE DÉVELOPPEMENT

| Outil | Version | Emplacement |
|-------|---------|-------------|
| OS | Windows 11 Home 10.0.22631 | — |
| Node.js | v25.2.0 | global |
| Python | 3.14.3 | global |
| pip | 25.3 | global |
| IfcOpenShell | 0.8.4 | pip global |
| Shell par défaut | bash (WSL syntax) | — |

**Dossier tests :** `C:\Users\abdou\Desktop\bim-ai-validation\`
- `test1-claude/` — Test Claude API (Node.js)
- `test2-ifc/` — Test IfcOpenShell (Python)
- `test3-threejs/` — Test Three.js (React/Vite)

---

## 8. L'ÉQUIPE — 27 AGENTS IA

### Structure hiérarchique
```
CTO (/project:cto)
├── Tech Lead Architecture (/project:tech-lead-archi)
│   ├── Solution Architect (/project:solution-architect)
│   ├── Enterprise Architect (/project:enterprise-architect)
│   ├── Data Architect (/project:data-architect)
│   └── Security Architect (/project:security-architect)
├── Tech Lead Development (/project:tech-lead-dev)
│   ├── Lead Designer (/project:lead-designer)
│   │   ├── UI Designer Senior (/project:ui-designer-senior)
│   │   ├── UI Designer Mid (/project:ui-designer-mid)
│   │   └── UX Researcher (/project:ux-researcher)
│   ├── Frontend Lead (/project:frontend-lead)
│   │   ├── React Engineer Senior (/project:react-engineer-senior)
│   │   ├── Three.js Specialist (/project:threejs-specialist)
│   │   └── Frontend Engineer Mid (/project:frontend-engineer-mid)
│   ├── Backend Lead (/project:backend-lead)
│   │   ├── NestJS Engineer Senior (/project:nestjs-engineer-senior)
│   │   ├── API Specialist (/project:api-specialist)
│   │   └── Backend Engineer Mid (/project:backend-engineer-mid)
│   └── BIM Technical Lead (/project:bim-technical-lead)
│       ├── IA/ML Engineer (/project:ia-ml-engineer)
│       └── Data Engineer (/project:data-engineer)
└── Tech Lead Ops & Quality (/project:tech-lead-ops)
    ├── DevOps Lead (/project:devops-lead)
    ├── QA Lead (/project:qa-lead)
    ├── QA Engineer (/project:qa-engineer)
    └── Test Automation Engineer (/project:test-automation-engineer)
```

**IMPORTANT :** Les commandes `/project:` sont dans `.claude/commands/`.
Elles se chargent au démarrage de Claude Code. Si elles ne fonctionnent pas :
→ Redémarrer Claude Code depuis le dossier projet.

---

## 9. GOUVERNANCE — RÈGLE FONDAMENTALE

```
PRODUIRE → SOUMETTRE → VALIDER → IMPLÉMENTER
   ↑                       ↑
 (Agents)              (Leads / CTO)
```

**Personne ne code avant que son lead ait validé l'approche.**

### Chaîne de validation pour Sprint 1
```
CTO approuve scope (✅ FAIT)
    ↓
Architects produisent (à faire — Session 2A)
    ↓
Tech Lead Archi valide (à faire — Session 2A)
    ↓
DevOps + QA planifient (à faire — Session 2B, parallèle)
    ↓
Tech Lead Ops valide (à faire — Session 2B)
    ↓
Leads produisent plans dev (à faire — Session 3)
    ↓
Tech Lead Dev valide (à faire — Session 3)
    ↓
DÉVELOPPEURS COMMENCENT (pas encore)
```

**Détail complet :** `docs/GOVERNANCE.md`
**Kickoff script :** `docs/SPRINT1_KICKOFF.md`

---

## 10. CHECKLIST KICKOFF SPRINT 1

```
SESSION 1 — CTO
✅ Stack validée (ADR-001 à ADR-004 approuvés)
✅ Scope Sprint 1 confirmé (Auth uniquement)
✅ Risques identifiés + budget API ($10)
⚠️  Action pending : recharger crédits Anthropic

SESSION 2A — Architecture
✅ ADR-001 Auth produit (Solution Architect)
✅ Schéma BDD validé (Data Architect)
✅ Threat model Auth produit (Security Architect)
✅ Tech Lead Archi a approuvé les 3 livrables

SESSION 2B — Ops & QA
✅ Docker Compose plan produit (DevOps Lead)
✅ Test strategy Sprint 1 produite (QA Lead)
✅ Tech Lead Ops a validé les 2 plans

SESSION 3 — Plans Dev
✅ Plan Frontend validé (Frontend Lead)
✅ Plan Backend validé (Backend Lead)
✅ Plan BIM validé (BIM Technical Lead)
✅ Tech Lead Dev a approuvé tous les plans
✅ Sprint 1 backlog officiel publié

DÉVELOPPEMENT EN COURS ← NOUS SOMMES ICI
▶️  feature/AUTH-01-nestjs-setup  (NestJS Senior)
▶️  feature/AUTH-07-vite-setup    (React Senior)
▶️  feature/AUTH-13-bim-service-setup (BIM Tech Lead)
⚠️  Test 1 Claude API : en attente recharge crédits
```

---

## 11. DOCUMENTS DE RÉFÉRENCE

| Document | Chemin | Contenu |
|----------|--------|---------|
| Architecture complète | `docs/ARCHITECTURE.md` | Diagrammes, stack, ADRs, modules NestJS |
| Guidelines dev | `docs/DEV_GUIDELINES.md` | Conventions code, patterns, Git workflow |
| Plan des sprints | `docs/SPRINT_PLAN.md` | 5 sprints, tâches, Definition of Done |
| Contrats API | `docs/API_CONTRACTS.md` | Tous les endpoints REST + SSE |
| Schéma BDD | `docs/DATABASE_SCHEMA.md` | Schema Prisma complet, index, seed |
| Gouvernance | `docs/GOVERNANCE.md` | RACI, chaînes de validation, règles |
| Kickoff Sprint 1 | `docs/SPRINT1_KICKOFF.md` | Prompts exacts dans l'ordre pour chaque session |
| État du projet | `docs/PROJECT_STATE.md` | État live, mis à jour après chaque session |
| Journal décisions | `docs/DECISIONS_LOG.md` | Audit trail de toutes les décisions |
| Commandes agents | `.claude/commands/*.md` | 27 fichiers agent |
| Config Claude Code | `CLAUDE.md` | Chargé automatiquement à chaque session |

---

## 12. COMMENT CONTINUER EN TANT QUE CTO

### Si tu reprends en début de session
1. Lire ce fichier (FAIT)
2. Lire `docs/PROJECT_STATE.md` pour l'état actuel
3. Lire `docs/DECISIONS_LOG.md` pour les dernières décisions
4. Identifier la prochaine session à conduire (voir checklist Section 10)
5. Utiliser les prompts de `docs/SPRINT1_KICKOFF.md`

### Si un agent te soumet quelque chose pour validation
- Demander : "Qui l'a produit ? Qui doit le valider avant moi ?"
- Vérifier la chaîne de gouvernance dans `docs/GOVERNANCE.md`
- Répondre avec : ✅ Approuvé / ⚠️ Modifications requises / ❌ Rejeté + raisons

### Si un dev veut commencer à coder
- Vérifier que son Lead a approuvé son plan
- Vérifier que Tech Lead Dev a donné le signal de démarrage
- Sinon : bloquer et rediriger vers la session de validation manquante

### Prochaine action immédiate
```
→ Vérifier si crédits Anthropic rechargés → relancer Test 1
→ Conduire Session 2A (voir SPRINT1_KICKOFF.md)
```
