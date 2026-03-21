# Gouvernance & Chaîne de Validation — BIM AI Assistant

> **Principe :** Aucune décision n'est définitive sans validation du lead responsable.
> **Modèle :** ESN professionnelle (Atos / Capgemini / Capgemini)

---

## La Règle Fondamentale

```
PRODUIRE → SOUMETTRE → VALIDER → IMPLÉMENTER
   ↑                       ↑
 (Agents)              (Leads / CTO)
```

**Personne ne code avant que son lead ait validé l'approche.**

---

## Hiérarchie de Validation

```
                    ┌─────────┐
                    │   CTO   │  ← Décisions stratégiques, budget, stack majeur
                    └────┬────┘
                         │ valide
              ┌──────────┴──────────┐
              │                     │
    ┌─────────▼──────────┐ ┌────────▼────────────┐
    │  Tech Lead Archi   │ │   Tech Lead Dev     │
    │  (Architecture)    │ │   (Développement)   │
    └─────────┬──────────┘ └────────┬────────────┘
              │ valide              │ valide
    ┌─────────┴────────┐   ┌────────┴─────────────┐
    │  4 Architects    │   │  Leads d'équipe       │
    │  - Solution      │   │  - Frontend Lead      │
    │  - Enterprise    │   │  - Backend Lead       │
    │  - Data          │   │  - BIM Technical Lead │
    │  - Security      │   └────────┬─────────────┘
    └──────────────────┘           │ valide
                            ┌──────┴───────────┐
                            │   Développeurs   │
                            │  (implémentent)  │
                            └──────────────────┘

    ┌────────────────────────────────────────────┐
    │         Tech Lead Ops & Quality            │
    │  Valide : infra, CI/CD, releases, sécurité │
    │  DevOps Lead · QA Lead · SRE               │
    └────────────────────────────────────────────┘
```

---

## Qui Valide Quoi

### CTO
| Décision | Exemple |
|----------|---------|
| Changement de stack majeur | Passer de NestJS à autre chose |
| Choix cloud provider | AWS vs GCP |
| Budget tech important | Infra > 1M FCFA/mois |
| Architecture macro (trimestiel) | Monolithe vs microservices |

> **Fréquence :** Décisions majeures uniquement, pas quotidien.

---

### Tech Lead Architecture
| Valide | Produit par |
|--------|-------------|
| Architecture applicative | Solution Architect |
| ADRs (Architecture Decision Records) | Solution Architect |
| Schéma de données | Data Architect |
| Revue sécurité | Security Architect |
| Vision long-terme | Enterprise Architect |

> **Règle :** Aucun ADR n'est adopté sans son approbation.

---

### Tech Lead Development
| Valide | Produit par |
|--------|-------------|
| Plan d'implémentation Frontend | Frontend Lead |
| Plan d'implémentation Backend | Backend Lead |
| Plan BIM Service | BIM Technical Lead |
| Sprint backlog (décomposition) | Tous leads dev |
| Code reviews critiques | Seniors + Leads |

> **Règle :** Aucun développeur ne démarre sans un plan validé par son Lead.

---

### Tech Lead Ops & Quality
| Valide | Produit par |
|--------|-------------|
| Pipeline CI/CD | DevOps Lead |
| Infrastructure Kubernetes | Cloud Engineer |
| Test plan de release | QA Lead |
| Métriques SLO/SLA | SRE |
| Go/No-Go en production | QA Lead + DevOps Lead |

> **Règle :** Aucune mise en production sans son feu vert.

---

### Leads d'équipe (Frontend / Backend / BIM)
| Valide | Produit par |
|--------|-------------|
| Code implémenté | Membres de leur équipe |
| Approche technique feature | Senior de l'équipe |
| PRs avant merge | Tous développeurs |

> **Règle :** 1 approbation Lead minimum avant tout merge sur `develop`.

---

## Flux de Validation par Type de Décision

### A. Décision d'Architecture (ex: choisir un pattern)
```
Solution Architect → propose ADR
        ↓
Tech Lead Architecture → review (approve / modify / reject)
        ↓ (si majeur)
CTO → validation finale
        ↓
Équipe implémente
```

### B. Feature Development (ex: nouvelle page)
```
Lead Designer → maquette validée
        ↓
Frontend Lead → plan technique (composants, état, API calls)
        ↓
Tech Lead Dev → valide le plan
        ↓
Frontend Engineer → implémente
        ↓
Frontend Lead → code review + approve PR
        ↓
QA Engineer → teste manuellement
        ↓
Tech Lead Ops → valide déploiement
```

### C. Décision de Données (ex: nouveau champ en BDD)
```
Data Architect → propose schéma Prisma
        ↓
Tech Lead Architecture → valide
        ↓
Backend Lead → implémente migration
        ↓
Tech Lead Dev → approuve PR
```

### D. Release en Production
```
QA Lead → test plan complet
        ↓
QA Engineer + Test Automation → exécutent les tests
        ↓
QA Lead → rapport go/no-go
        ↓
Tech Lead Ops → feu vert deployment
        ↓
DevOps Lead → déploie (avec approval manuel GitHub Actions)
```

---

## Règles de Communication Inter-Agents

### Quand un agent bloque ou a un problème
```
1. Identifier le blocage
2. En informer son Lead direct (pas directement le CTO)
3. Lead décide : résoudre lui-même ou remonter
```

### Quand deux équipes ont un désaccord
```
1. Les deux Leads discutent et proposent une solution
2. Si pas de consensus → Tech Lead Dev arbitre
3. Si impacte l'architecture → Tech Lead Architecture arbitre
4. Si stratégique → CTO tranche
```

### Fréquence de validation recommandée
| Moment | Action |
|--------|--------|
| Début de sprint | CTO valide scope · Tech Lead Archi valide architecture · Tech Lead Dev valide plan |
| Daily | Leads valident blocages de leurs équipes |
| Fin de sprint | Tech Lead Ops valide release · QA Lead donne go/no-go |
| Trimestre | CTO + Tech Leads : revue architecture globale |

---

## Matrice RACI — Sprint 1

| Activité | CTO | TL Archi | TL Dev | TL Ops | Lead Archi | Lead Front | Lead Back | Dev |
|----------|-----|----------|--------|--------|------------|------------|-----------|-----|
| Valider scope Sprint 1 | **A** | C | C | C | - | - | - | - |
| Concevoir architecture | I | **A** | C | - | **R** | - | - | - |
| Valider DB schema | I | **A** | C | - | **R** | - | - | - |
| Plan Frontend | I | I | **A** | - | - | **R** | - | - |
| Plan Backend | I | I | **A** | - | - | - | **R** | - |
| Setup CI/CD | I | I | I | **A** | - | - | - | **R** |
| Implémenter features | - | - | I | - | - | C | C | **R** |
| Valider PR | - | - | I | - | - | **A** | **A** | - |
| Valider release | I | I | I | **A** | - | - | - | - |

*R = Responsible (fait) · A = Accountable (valide) · C = Consulted · I = Informed*
