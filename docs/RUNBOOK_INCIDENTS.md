# Runbook Incidents — BIM AI Assistant
# DevOps Lead / SRE — Référence de réponse aux incidents

> **MTTR cible :** < 1 heure pour les incidents P0/P1
> **Escalade :** DevOps Lead → Tech Lead Ops → CTO (P0 uniquement)

---

## Niveaux de sévérité

| Niveau | Définition | Exemple | Délai réponse |
|--------|-----------|---------|---------------|
| **P0** | Service totalement indisponible | Backend down, DB down | < 15 min |
| **P1** | Dégradation significative | Latence > 2s, error rate > 5% | < 1 heure |
| **P2** | Impact mineur | Latence > 500ms, warning mémoire | < 4 heures |
| **P3** | Cosmétique / non bloquant | Log spam, métrique marginale | Sprint suivant |

---

## Procédure générale

```
1. DÉTECTER  → Alerte Prometheus / Grafana / rapport utilisateur
2. QUALIFIER → Définir le niveau P0/P1/P2/P3
3. COMMUNIQUER → Notifier l'équipe (Slack #incidents)
4. DIAGNOSTIQUER → Consulter les runbooks ci-dessous
5. RÉSOUDRE → Appliquer le fix
6. VÉRIFIER → Confirmer que les métriques reviennent à la normale
7. POST-MORTEM → Rédiger le RCA si P0/P1 (dans les 24h)
```

---

## Backend Down

**Alerte :** `BackendDown` (Prometheus)
**Impact :** Application inutilisable

### Diagnostic

```bash
# 1. Vérifier l'état des pods
kubectl get pods -n production -l app=backend

# 2. Logs du pod défaillant
kubectl logs -n production -l app=backend --tail=100

# 3. Décrire le pod (events K8s)
kubectl describe pod -n production -l app=backend

# 4. Vérifier le health check
kubectl exec -n production deploy/backend -- curl -sf http://localhost:3000/api/health
```

### Causes fréquentes et fixes

| Cause | Symptôme | Fix |
|-------|----------|-----|
| Crash JS (OOM) | Pod en OOMKilled | `kubectl delete pod <pod> -n production` (redémarre) + augmenter memory limit |
| Erreur DB connection | `connect ECONNREFUSED` dans les logs | Vérifier PostgreSQL (voir section PostgreSQL down) |
| Erreur Redis connection | `Redis connection error` dans les logs | Vérifier Redis (voir section Redis down) |
| Bad deploy | ImagePullBackOff | Rollback (voir section Rollback) |
| Config manquante | `Joi validation error` au démarrage | Vérifier les Secrets K8s |

### Rollback rapide

```bash
# Voir l'historique des deployments
kubectl rollout history deployment/backend -n production

# Rollback à la révision précédente
kubectl rollout undo deployment/backend -n production

# Vérifier le statut du rollback
kubectl rollout status deployment/backend -n production --timeout=5m
```

---

## Latence Élevée

**Alerte :** `APILatencyHigh` (p95 > 500ms) ou `APILatencyCritical` (p95 > 2s)
**SLO :** p95 < 200ms

### Diagnostic

```bash
# Vérifier l'utilisation CPU/Mémoire
kubectl top pods -n production -l app=backend

# Vérifier le nombre de replicas actifs
kubectl get hpa backend-hpa -n production

# Vérifier les connexions PostgreSQL
kubectl exec -n production deploy/backend -- \
  npx prisma studio  # OU vérifier directement en DB

# Logs d'erreur récents
kubectl logs -n production -l app=backend --tail=200 | grep -i "error\|slow\|timeout"
```

### Fixes par cause

| Cause | Fix |
|-------|-----|
| Trop de requêtes | HPA scale out automatique — vérifier `kubectl get hpa -n production` |
| N+1 query DB | Identifier la route lente dans Grafana → optimiser la query (Data Architect) |
| Redis lent | Vérifier `redis_latency_percentiles` dans Grafana |
| Déploiement récent | Comparer la latence avant/après → rollback si nécessaire |

### Scale out manuel (urgence)

```bash
# Scale temporaire si HPA ne réagit pas assez vite
kubectl scale deployment/backend --replicas=6 -n production

# Remettre à la normale après stabilisation
kubectl scale deployment/backend --replicas=2 -n production
```

---

## Taux d'Erreur 5xx Élevé

**Alerte :** `ErrorRateHigh` (> 1%) ou `ErrorRateCritical` (> 5%)

### Diagnostic

```bash
# Identifier les routes qui échouent (Grafana ou logs)
kubectl logs -n production -l app=backend --tail=500 | grep "500\|5[0-9][0-9]"

# Vérifier la dernière migration Prisma
kubectl exec -n production deploy/backend -- npx prisma migrate status
```

### Fixes par cause

| Erreur | Cause probable | Fix |
|--------|---------------|-----|
| 500 sur toutes les routes | Bug code ou mauvaise config | Rollback |
| 500 sur routes DB | Migration incorrecte | Rollback migration + déploiement |
| 500 sur `/api/auth/*` | JWT_SECRET changé | Vérifier le Secret K8s |
| 503 | Pods pas prêts | Vérifier `kubectl get pods` |

---

## PostgreSQL Down

**Alerte :** Backend renvoie des erreurs DB, Redis OK
**Impact :** Toutes les features nécessitant de la persistance

### Diagnostic

```bash
# Vérifier la connexion depuis le backend
kubectl exec -n production deploy/backend -- \
  sh -c 'psql $DATABASE_URL -c "SELECT 1"'

# Vérifier RDS (si AWS)
aws rds describe-db-instances --db-instance-identifier bim-ai-db --region eu-west-1 \
  | jq '.DBInstances[0].DBInstanceStatus'

# Vérifier les connexions actives
aws rds describe-db-log-files --db-instance-identifier bim-ai-db
```

### Fix

```bash
# Si RDS en maintenance automatique → attendre (max 30 min)
# Si failover nécessaire :
aws rds failover-db-cluster --db-cluster-identifier bim-ai-cluster

# Redémarrer les pods backend après restauration DB
kubectl rollout restart deployment/backend -n production
```

---

## Redis Down

**Alerte :** `RedisDown` (Prometheus)
**Impact :** Authentification (refresh tokens), rate limiting

### Diagnostic

```bash
# Test de connexion Redis depuis le backend
kubectl exec -n production deploy/backend -- \
  sh -c 'redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD ping'
```

### Impact et mitigation temporaire

| Feature | Impact si Redis down | Mitigation |
|---------|---------------------|------------|
| Refresh tokens | Impossible de se connecter (nouveaux logins) | Session actives (JWT valides 15min) continuent |
| Rate limiting | Rate limiting désactivé | Risque DDoS — monitorer |
| Cache | Dégradation perf uniquement | — |

### Fix

```bash
# Redémarrer le pod Redis (si déployé en K8s)
kubectl rollout restart deployment/redis -n production

# Si ElastiCache (AWS) → failover
aws elasticache reboot-replication-group \
  --replication-group-id bim-ai-redis \
  --apply-immediately
```

---

## Pod CrashLoop

**Alerte :** `PodCrashLooping`

### Diagnostic

```bash
# Voir les derniers logs avant crash
kubectl logs -n production <pod-name> --previous

# Vérifier les events
kubectl describe pod -n production <pod-name> | grep -A 20 Events

# Vérifier les limites de ressources
kubectl get pod -n production <pod-name> -o jsonpath='{.spec.containers[*].resources}'
```

### Fixes courants

```bash
# OOMKilled → augmenter la limite mémoire temporairement
kubectl set resources deployment/backend -n production \
  --limits=memory=1Gi --requests=memory=512Mi

# Bad config → vérifier les secrets
kubectl get secret backend-secrets -n production -o jsonpath='{.data}' | base64 -d

# Rollback si causé par un déploiement récent
kubectl rollout undo deployment/backend -n production
```

---

## Blue-Green Deployment — Procédure

```bash
# 1. Déployer la nouvelle version sur le slot green
kubectl set image deployment/backend-green \
  backend=ghcr.io/OWNER/bim-ai-backend:sha-<new-commit> \
  -n production

# 2. Attendre que green soit ready
kubectl rollout status deployment/backend-green -n production --timeout=5m

# 3. Vérifier le health check sur green
kubectl port-forward svc/backend-green 3001:80 -n production &
curl http://localhost:3001/api/health

# 4. Switcher le trafic de blue → green
kubectl patch service backend -n production \
  -p '{"spec":{"selector":{"slot":"green"}}}'

# 5. Vérifier les métriques (Grafana) pendant 5 minutes

# 6. Si OK → supprimer le slot blue
kubectl scale deployment/backend-blue --replicas=0 -n production

# 6b. Si KO → rollback immédiat
kubectl patch service backend -n production \
  -p '{"spec":{"selector":{"slot":"blue"}}}'
```

---

## Post-Mortem Template (P0/P1)

```markdown
## Post-Mortem — [Titre de l'incident]

**Date :** YYYY-MM-DD
**Durée :** Xx heures Xx minutes
**Sévérité :** P0 / P1
**Services impactés :** Backend / Frontend / BIM Service

### Timeline
| Heure | Événement |
|-------|-----------|
| HH:MM | Alerte déclenchée |
| HH:MM | Début investigation |
| HH:MM | Cause identifiée |
| HH:MM | Fix déployé |
| HH:MM | Métriques normalisées |

### Cause racine (Root Cause)
[Description précise de la cause]

### Impact
- Utilisateurs affectés : X
- Transactions perdues : X
- Durée d'indisponibilité : Xmin

### Fix appliqué
[Ce qui a été fait pour résoudre]

### Actions préventives
| Action | Owner | Deadline |
|--------|-------|----------|
| [Action] | [Nom] | [Date] |
```

---

## Contacts d'escalade

| Rôle | Responsabilité | Escalade si |
|------|---------------|-------------|
| DevOps Lead | First responder infra | Toujours |
| Tech Lead Ops | Escalade P0/P1 | > 30min sans résolution |
| Backend Lead | Escalade bugs applicatifs | Cause identifiée côté code |
| CTO | Escalade P0 avec impact business | > 1h d'indisponibilité prod |
