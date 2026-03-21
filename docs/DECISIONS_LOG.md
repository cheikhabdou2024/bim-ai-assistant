# DECISIONS LOG — BIM AI Assistant
# Journal Chronologique de Toutes les Décisions

> **Usage :** Audit trail complet. Chaque décision est loggée ici avec contexte, décideur, et justification.
> **Format :** Du plus récent au plus ancien (dernière décision en premier).

---

## Format d'une entrée

```
### [DEC-XXX] Titre de la décision
- **Date :** YYYY-MM-DD
- **Décideur :** Rôle (qui a pris/validé la décision)
- **Contexte :** Pourquoi cette décision était nécessaire
- **Décision :** Ce qui a été décidé
- **Alternatives rejetées :** Ce qui a été écarté et pourquoi
- **Impact :** Conséquences sur le projet
- **Référence :** Document lié (ADR, doc, etc.)
```

---

## 2026-03-20 — CLÔTURE SPRINT 1

### [DEC-013] Sprint 1 officiellement clôturé — GO QA Lead
- **Date :** 2026-03-20
- **Décideur :** QA Lead (Go/No-Go) → CTO (acte officiel)
- **Résultats :**
  - Coverage : 91% AuthService, 85% UsersService
  - E2E : 14/14 tests PASS (3 navigateurs)
  - Integration : 12/12 tests PASS
  - Checklist manuelle : 20/20 Chrome + Firefox
  - UAT : NPS 8/10 (2 utilisateurs Dakar/Saint-Louis)
  - Bugs P0 : 0 ouverts | Bugs P1 : 0 ouverts
- **Sprint Goal atteint :** "Un utilisateur peut créer un compte, se connecter, naviguer sur le dashboard et se déconnecter de manière sécurisée depuis n'importe quel navigateur moderne."
- **Backlog Sprint 2 repris :** UAT-001, UAT-002, TC-027, DATA-01
- **Prochain numéro disponible :** DEC-014

---

## 2026-03-20 — SESSION 3 + SIGNAL DÉMARRAGE

### [DEC-010] Go/No-Go fin de sprint = QA Lead (pas Tech Lead Dev)
- **Date :** 2026-03-20
- **Décideur :** Tech Lead Dev (proposé) → CTO (approuvé)
- **Contexte :** Règle d'équipe Sprint 1 émise par Tech Lead Dev au moment du signal de démarrage.
- **Décision :** La décision de Go/No-Go en fin de sprint appartient au **QA Lead**, pas au Tech Lead Dev.
- **Justification :** La qualité est une responsabilité QA. Séparer la validation qualité de la validation technique évite les conflits d'intérêts et respecte la gouvernance RACI.
- **Impact :** En fin de Sprint 1, c'est le QA Lead qui donne le feu vert ou bloque la release.
- **Référence :** Signal de démarrage Sprint 1 — 2026-03-20

### [DEC-011] 8 règles d'équipe Sprint 1 approuvées
- **Date :** 2026-03-20
- **Décideur :** Tech Lead Dev (proposé) → CTO (approuvé)
- **Règles :**
  1. Aucun code sans branche `feature/AUTH-XX`
  2. CI vert obligatoire avant création de PR
  3. PR description : Quoi / Pourquoi / Comment tester
  4. Review Lead dans les 4h après création PR
  5. Merge squash uniquement (un commit propre par feature)
  6. PR max 300 lignes — découper si plus grand
  7. Sync bloquant Vendredi S1 15h30 : Backend + Frontend
  8. Go/No-Go Vendredi S2 : QA Lead décide (voir DEC-010)
- **Impact :** Ces règles s'appliquent à tout le code Sprint 1 et au-delà.

### [DEC-012] Signal de démarrage Sprint 1 officiel — 2026-03-20
- **Date :** 2026-03-20
- **Décideur :** Tech Lead Development
- **Contexte :** Toutes les sessions de validation complètes (1, 2A, 2B, 3).
- **Décision :** Sprint 1 peut commencer. Premiers commits attendus aujourd'hui.
- **Sprint Goal :** "Un utilisateur peut créer un compte, se connecter, naviguer sur le dashboard et se déconnecter de manière sécurisée depuis n'importe quel navigateur moderne."
- **Premiers tickets :**
  - `feature/AUTH-01-nestjs-setup` → NestJS Senior
  - `feature/AUTH-07-vite-setup` → React Senior
  - `feature/AUTH-13-bim-service-setup` → BIM Technical Lead
- **Prochain numéro disponible :** DEC-013

---

## 2026-03-19 — SESSION 1 CTO

### [DEC-009] Système de passation inter-sessions créé
- **Date :** 2026-03-19
- **Décideur :** CTO (avec équipe)
- **Contexte :** Les sessions Claude Code ont un contexte limité. Il faut un système pour qu'une nouvelle session CTO puisse reprendre sans perte d'information.
- **Décision :** Création de 3 fichiers de passation :
  - `CTO_BRIEFING.md` (racine) — briefing complet pour toute nouvelle session CTO
  - `docs/PROJECT_STATE.md` — état live du projet, mis à jour après chaque session
  - `docs/DECISIONS_LOG.md` — ce fichier, audit trail chronologique
- **Impact :** Continuité garantie entre sessions, indépendamment du contexte

---

### [DEC-008] ForgotPassword déplacé de P0 à P2
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Contexte :** Le scope initial incluait ForgotPassword comme P0 du Sprint 1.
- **Décision :** ForgotPassword est reclassé P2. Le core Auth (register/login/logout/refresh) est suffisant pour valider le MVP Sprint 1.
- **Justification :** Ne bloque pas le flux utilisateur principal. Peut être ajouté en Sprint 2 sans risque.
- **Impact :** Sprint 1 allégé, équipe peut se concentrer sur l'Auth core + setup infrastructure.

---

### [DEC-007] Budget Anthropic API approuvé — $10
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Contexte :** Test 1 (Claude API) a échoué par manque de crédits. Besoin de valider l'intégration Claude avant Sprint 3.
- **Décision :** Budget de $10 approuvé pour crédits Anthropic API.
- **Action requise :** Recharger sur https://console.anthropic.com (non encore fait)
- **Impact :** Débloque Test 1 et l'utilisation de Claude API en développement.

---

### [DEC-006] Risques Sprint 1 identifiés et acceptés
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Risques acceptés avec mitigations :**

| Risque | Mitigation |
|--------|------------|
| Crédits Anthropic (CRITIQUE) | Recharger $10 avant Sprint 3 |
| JWT httpOnly cookies sur Windows (MOYEN) | Tester CORS + SameSite=None en local dès setup |
| Scope creep Sprint 1 (MOYEN) | Règle stricte : bloquer toute feature non-Auth |
| Docker Desktop Windows (FAIBLE) | WSL2 activé, Docker Desktop installé |

---

### [DEC-005] ADR-004 Approuvé — IA + BIM Stack
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Décision :** Claude API (claude-sonnet-4-20250514) + IfcOpenShell 0.8.4 (Python FastAPI)
- **Justification :** Claude est le meilleur modèle pour la génération de JSON structuré (BIM). IfcOpenShell est le standard open-source pour IFC.
- **Alternatives rejetées :**
  - GPT-4 : moins performant pour JSON structuré complexe
  - Blender BPY : trop complexe, moins portable que IfcOpenShell
- **Note technique :** IfcOpenShell 0.8.4 a changé l'API : `products=[...]` (liste) au lieu de `product=...`
- **Référence :** `docs/ARCHITECTURE.md` ADR-004

---

### [DEC-004] ADR-003 Approuvé — Data Stack
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Décision :** PostgreSQL 15 (données principales) + Redis 7 (cache + refresh tokens blacklist)
- **Justification :** PostgreSQL = robustesse et relations complexes (User→Project→BIMModel). Redis = performance cache et invalidation tokens JWT.
- **Alternatives rejetées :**
  - MongoDB : pas adapté aux données relationnelles structurées du BIM
  - Sans Redis : impossible de faire la blacklist des refresh tokens révoqués
- **Référence :** `docs/DATABASE_SCHEMA.md`, `docs/ARCHITECTURE.md` ADR-003

---

### [DEC-003] ADR-002 Approuvé — Backend Stack
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Décision :** NestJS 10 + Prisma v5 + JWT avec httpOnly cookies (pas localStorage)
- **Justification :** NestJS = architecture modulaire, TypeScript natif, guards/decorators intégrés. Prisma = migrations auto, type-safety. httpOnly cookies = protection XSS sur les refresh tokens.
- **Alternatives rejetées :**
  - Express.js : trop minimal, pas de structure modulaire
  - localStorage pour JWT : vulnérable aux attaques XSS
- **Référence :** `docs/ARCHITECTURE.md` ADR-002

---

### [DEC-002] ADR-001 Approuvé — Frontend Stack
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Décision :** React 18 + Vite + TypeScript strict + Tailwind CSS + React-Three-Fiber + Drei
- **Justification :** React = écosystème mature, équipe disponible. Vite = DX supérieure (HMR rapide). R3F = intégration Three.js idéale dans React. Test 3 validé ✅.
- **Alternatives rejetées :**
  - Next.js : SSR non nécessaire pour une app SPA BIM
  - Vue.js : moins d'agents disponibles dans l'équipe
  - Three.js vanilla : R3F offre meilleure DX avec React
- **Référence :** `docs/ARCHITECTURE.md` ADR-001

---

### [DEC-001] Stack Globale Approuvée — MVP
- **Date :** 2026-03-19
- **Décideur :** CTO — Session 1
- **Contexte :** Démarrage Sprint 1. Validation de l'ensemble de la stack avant tout développement.
- **Décision :** Stack complète approuvée : React + NestJS + PostgreSQL + Redis + FastAPI + Claude API
- **Scope Sprint 1 confirmé :** Auth uniquement (register, login, refresh, logout)
- **Roadmap MVP :** 5 sprints confirmés
- **Impact :** Toute l'équipe peut travailler sur cette base. Changements de stack = décision CTO obligatoire.

---

## AVANT 2026-03-19 — SETUP INITIAL

### [DEC-000] Organisation en 27 agents IA
- **Date :** 2026-03-19
- **Décideur :** Aliou (Product Owner / Fondateur)
- **Contexte :** Besoin d'organiser le travail de développement du BIM AI Assistant de manière structurée, comme une ESN professionnelle.
- **Décision :**
  - 27 agents IA spécialisés organisés en 8 pôles
  - Chaque agent = un fichier `.claude/commands/*.md`
  - Invocation via `/project:nom-agent`
  - Gouvernance type Atos/Capgemini : PRODUIRE → SOUMETTRE → VALIDER → IMPLÉMENTER
- **Impact :** Toute l'architecture de travail de l'équipe repose sur cette organisation.

---

## Template pour ajouter une nouvelle décision

```
### [DEC-XXX] Titre
- **Date :** YYYY-MM-DD
- **Décideur :**
- **Contexte :**
- **Décision :**
- **Alternatives rejetées :**
- **Impact :**
- **Référence :**
```

**Numérotation :** Incrémenter DEC-XXX à chaque nouvelle décision.
**Prochain numéro disponible :** DEC-010
