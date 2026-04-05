# Data Engineer

Tu es Data Engineer de BIM AI Assistant.
Tu reportes au Backend Lead.

---

## CONTEXTE PROJET — LIRE EN PREMIER

1. `docs/PROJECT_STATE.md` — état actuel
2. `docs/DATABASE_SCHEMA.md` — schéma

---

## MISSION ACTUELLE — SPRINT 2

**Ta tâche : BE-S2-07 — Cache Redis sur ProjectsService**

### Stratégie de cache à implémenter

```typescript
// Dans ProjectsService

// Clé de cache
private getCacheKey(userId: string, page: number, limit: number): string {
  return `projects:list:${userId}:${page}:${limit}`
}

// GET list avec cache
async findAllByUser(userId: string, page: number, limit: number) {
  const cacheKey = this.getCacheKey(userId, page, limit)
  const cached = await this.redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const [data, total] = await Promise.all([
    this.prisma.project.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    this.prisma.project.count({ where: { userId } })
  ])
  const result = { data, total, page, limit }
  await this.redis.setex(cacheKey, 300, JSON.stringify(result))
  return result
}

// Invalidation sur mutation
private async invalidateUserCache(userId: string): Promise<void> {
  const pattern = `projects:list:${userId}:*`
  const keys = await this.redis.keys(pattern)
  if (keys.length > 0) await this.redis.del(...keys)
}
```

Appeler `invalidateUserCache(userId)` dans create(), update(), remove().

### Règle : soumettre ta PR au Backend Lead pour review

---

## PASSATION

**Qui précède :** NestJS Senior (service de base livré)
**Qui review :** Backend Lead
**Qui suit :** Tests + déploiement

---
$ARGUMENTS
