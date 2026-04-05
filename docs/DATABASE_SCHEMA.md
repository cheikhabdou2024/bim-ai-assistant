# Database Schema — BIM AI Assistant

> **ORM :** Prisma
> **Base de données :** PostgreSQL 15+
> **Conventions :** UUID, timestamps, snake_case pour les tables

---

## Schéma Prisma complet (MVP)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String   // bcrypt hash
  avatar    String?  // URL S3
  role      Role     @default(USER)

  // Relations
  projects        Project[]
  refreshTokens   RefreshToken[]
  conversations   Conversation[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
  @@index([email])
}

enum Role {
  USER
  ADMIN
}

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revoked   Boolean  @default(false)

  createdAt DateTime @default(now())

  @@map("refresh_tokens")
  @@index([userId])
  @@index([token])
}

// ─────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────

model Project {
  id          String        @id @default(uuid())
  name        String
  description String?
  status      ProjectStatus @default(DRAFT)
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  models        BIMModel[]
  conversations Conversation[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("projects")
  @@index([userId])
  @@index([userId, status])
}

enum ProjectStatus {
  DRAFT     // Projet créé, pas encore de modèle BIM
  ACTIVE    // Projet avec au moins un modèle BIM généré
  ARCHIVED  // Projet archivé (lecture seule)
}

// ─────────────────────────────────────────
// BIM MODELS
// ─────────────────────────────────────────

model BIMModel {
  id          String      @id @default(uuid())
  name        String      @default("Modèle BIM")
  projectId   String
  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Données BIM
  jsonData    Json        // Structure BIM complète (rooms, walls, etc.)
  ifcUrl      String?     // URL S3 du fichier IFC généré
  ifcSize     Int?        // Taille en bytes
  status      BIMStatus   @default(PENDING)

  // Métriques
  roomsCount  Int?
  wallsCount  Int?
  storeys     Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("bim_models")
  @@index([projectId])
  @@index([projectId, status])
}

enum BIMStatus {
  PENDING       // En attente de génération
  GENERATING    // En cours de génération
  READY         // IFC généré et disponible
  ERROR         // Erreur de génération
}

// ─────────────────────────────────────────
// AI CONVERSATIONS
// ─────────────────────────────────────────

model Conversation {
  id        String    @id @default(uuid())
  projectId String
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  messages  Message[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("conversations")
  @@index([projectId])
  @@index([userId])
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  role     MessageRole  // user | assistant
  content  String       // Texte du message
  bimData  Json?        // JSON BIM si message assistant avec génération

  // Tokens Claude API (pour cost tracking)
  inputTokens  Int?
  outputTokens Int?

  createdAt DateTime @default(now())

  @@map("messages")
  @@index([conversationId])
}

enum MessageRole {
  USER
  ASSISTANT
}
```

---

## Diagramme de Relations

```
User
 │
 ├──► Project (1-to-many)
 │       │
 │       ├──► BIMModel (1-to-many)
 │       │
 │       └──► Conversation (1-to-many)
 │                  │
 │                  └──► Message (1-to-many)
 │
 └──► RefreshToken (1-to-many)
```

---

## Index de Performance

| Table | Index | Raison |
|-------|-------|--------|
| `users` | `email` | Login lookup |
| `refresh_tokens` | `token`, `userId` | Auth vérification |
| `projects` | `userId`, `(userId, status)` | Liste par user + filter |
| `bim_models` | `projectId`, `(projectId, status)` | Liste par projet + filter |
| `conversations` | `projectId`, `userId` | Historique par projet |
| `messages` | `conversationId` | Messages d'une conversation |

---

## Migrations Prisma

### Commandes de base
```bash
# Créer une migration
npx prisma migrate dev --name nom_de_la_migration

# Appliquer en production
npx prisma migrate deploy

# Générer le client Prisma
npx prisma generate

# Voir l'état des migrations
npx prisma migrate status

# Ouvrir Prisma Studio (GUI)
npx prisma studio
```

### Règle : 1 migration = 1 changement logique
Ne jamais grouper des changements non liés dans une même migration.

---

## Données de Seed (Développement)

Pour le développement local, un seed crée :
- 1 admin : `admin@bim-ai.com` / `Admin123!`
- 2 users test : `user1@test.com`, `user2@test.com`
- 3 projets par user
- 1-2 modèles BIM par projet (si possible)

```bash
# Lancer le seed
npx prisma db seed
```

---

## Évolutions Prévues (Post-MVP)

| Feature | Changement Schema |
|---------|-----------------|
| Collaboration temps réel | Table `ProjectMember` (userId, projectId, role) |
| Versioning modèles | Champ `version` + `parentId` sur `BIMModel` |
| Templates BIM | Table `Template` (publique, réutilisable) |
| Organisations | Table `Organization` + `OrganizationMember` |
| Commentaires | Table `Comment` (sur BIMModel) |
