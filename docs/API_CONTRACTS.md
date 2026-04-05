# API Contracts — BIM AI Assistant

> **Base URL :** `/api`
> **Auth :** Bearer JWT (header `Authorization: Bearer <token>`)
> **Format :** JSON (sauf export fichiers)
> **Swagger UI :** `/api/docs` (staging)

---

## Convention Réponses

### Succès
```json
// Liste paginée
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}

// Ressource unique
{
  "id": "uuid",
  "name": "...",
  "createdAt": "2026-03-19T10:00:00Z"
}
```

### Erreurs
```json
{
  "statusCode": 400,
  "message": "Description de l'erreur",
  "error": "Bad Request"
}
```

### Status codes utilisés
| Code | Signification |
|------|--------------|
| 200 | Succès (GET, PATCH) |
| 201 | Créé (POST) |
| 204 | Supprimé sans contenu (DELETE) |
| 400 | Données invalides |
| 401 | Non authentifié |
| 403 | Accès refusé (rôle insuffisant — routes admin uniquement) |
| 404 | Ressource introuvable **ou** non possédée par l'utilisateur (ADR-008 — information hiding) |
| 404 | Ressource introuvable |
| 409 | Conflit (email déjà utilisé) |
| 422 | Validation échouée |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur |

---

## AUTH MODULE

### POST /api/auth/register
Créer un compte utilisateur.

**Body :**
```json
{
  "name": "Aliou Diallo",
  "email": "aliou@example.com",
  "password": "Password123!"
}
```

**Règles :**
- `name` : 2-100 caractères
- `email` : format email valide, unique
- `password` : min 8 caractères, 1 majuscule, 1 chiffre

**Réponse 201 :**
```json
{
  "id": "uuid",
  "name": "Aliou Diallo",
  "email": "aliou@example.com",
  "createdAt": "2026-03-19T10:00:00Z"
}
```

**Réponse 409 :** Email déjà utilisé

---

### POST /api/auth/login
Authentifier un utilisateur.

**Rate limit :** 5 tentatives / minute

**Body :**
```json
{
  "email": "aliou@example.com",
  "password": "Password123!"
}
```

**Réponse 200 :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Aliou Diallo",
    "email": "aliou@example.com"
  }
}
```
+ Cookie httpOnly : `refreshToken` (7 jours)

---

### POST /api/auth/refresh
Renouveler l'access token.

**Cookie requis :** `refreshToken`

**Réponse 200 :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /api/auth/logout
**Auth requise**

**Réponse 200 :**
```json
{ "message": "Logged out successfully" }
```
+ Supprime le cookie `refreshToken`

---

## USERS MODULE

### GET /api/users/me
**Auth requise**

**Réponse 200 :**
```json
{
  "id": "uuid",
  "name": "Aliou Diallo",
  "email": "aliou@example.com",
  "avatar": "https://s3.amazonaws.com/...",
  "createdAt": "2026-03-19T10:00:00Z"
}
```

---

### PATCH /api/users/me
**Auth requise**

**Body :**
```json
{
  "name": "Aliou Ba",
  "avatar": "https://s3.amazonaws.com/..."
}
```

**Réponse 200 :** Utilisateur mis à jour

---

## PROJECTS MODULE

### GET /api/projects
**Auth requise** — Retourne uniquement les projets de l'utilisateur connecté.

**Query params :**
- `page` (défaut: 1)
- `limit` (défaut: 10, max: 50)
- `status` (optionnel: `DRAFT` | `ACTIVE` | `ARCHIVED`)
- `search` (optionnel: recherche sur name, case-insensitive)

**Réponse 200 :**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Villa Dakar",
      "description": "Projet résidentiel 3 chambres",
      "status": "active",
      "modelsCount": 3,
      "lastModelAt": "2026-03-19T10:00:00Z",
      "createdAt": "2026-03-19T10:00:00Z",
      "updatedAt": "2026-03-19T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/projects
**Auth requise**

**Body :**
```json
{
  "name": "Villa Dakar",
  "description": "Projet résidentiel 3 chambres"
}
```

**Règles :**
- `name` : 2-100 caractères, requis
- `description` : max 500 caractères, optionnel

**Réponse 201 :** Projet créé

---

### GET /api/projects/:id
**Auth requise** — 404 si pas le propriétaire ou inexistant (ADR-008).

**Réponse 200 :**
```json
{
  "id": "uuid",
  "name": "Villa Dakar",
  "description": "...",
  "status": "ACTIVE",
  "createdAt": "2026-03-19T10:00:00Z",
  "updatedAt": "2026-03-19T10:00:00Z"
}
```

---

### PATCH /api/projects/:id
**Auth requise** — 404 si pas le propriétaire ou inexistant (ADR-008).

**Body :**
```json
{
  "name": "Villa Dakar V2",
  "description": "Mise à jour",
  "status": "ACTIVE"
}
```

**Réponse 200 :** Projet mis à jour

---

### DELETE /api/projects/:id
**Auth requise** — 404 si pas le propriétaire ou inexistant (ADR-008).

**Réponse 204 :** Supprimé

---

## AI MODULE

### POST /api/ai/generate
**Auth requise**

Génère un modèle BIM depuis un prompt textuel. Réponse en streaming (SSE).

**Body :**
```json
{
  "projectId": "uuid",
  "prompt": "Génère une maison de 2 chambres avec un salon et une cuisine"
}
```

**Réponse : Server-Sent Events (SSE)**
```
Content-Type: text/event-stream

data: {"type": "start"}

data: {"type": "chunk", "content": "{\"building\":"}

data: {"type": "chunk", "content": " {\"name\": \"Maison\""}

data: {"type": "complete", "modelId": "uuid", "bimData": {...}}

data: {"type": "error", "message": "..."}
```

---

## BIM MODULE

### POST /api/bim/validate
**Auth requise**

Valide une structure BIM JSON sans générer de fichier.

**Body :**
```json
{
  "building": { "name": "Maison Test", "storeys": 1 },
  "rooms": [{ "id": "r1", "name": "Chambre", "area": 12 }],
  "walls": [{ "id": "w1", "thickness": 0.2 }]
}
```

**Réponse 200 (valide) :**
```json
{
  "valid": true,
  "warnings": []
}
```

**Réponse 422 (invalide) :**
```json
{
  "valid": false,
  "errors": [
    { "field": "walls[0].thickness", "message": "Épaisseur minimum : 0.1m" }
  ]
}
```

---

### GET /api/bim/models/:id/download
**Auth requise**

Retourne une URL signée S3 pour télécharger le fichier IFC.

**Réponse 200 :**
```json
{
  "url": "https://s3.amazonaws.com/bim-ai/models/uuid.ifc?X-Amz-Signature=...",
  "expiresAt": "2026-03-19T11:00:00Z"
}
```

---

## Rate Limits

| Endpoint | Limite |
|----------|--------|
| POST /api/auth/login | 5 req/min |
| POST /api/auth/register | 10 req/min |
| POST /api/projects | 20 req/min (ADR-007) |
| DELETE /api/projects/:id | 10 req/min (ADR-007) |
| POST /api/ai/generate | 10 req/heure |
| Autres endpoints | 100 req/min |
