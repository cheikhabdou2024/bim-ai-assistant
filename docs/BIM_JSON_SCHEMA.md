# BIM JSON Schema — Sprint 3

## Overview

The BIM JSON Schema defines the structure that the AI (Claude) produces during chat,
which is then validated and used to generate IFC files via IfcOpenShell.

## Schema Definition

```json
{
  "type": "building",
  "name": "string (1-255 chars)",
  "floors": "integer (1-100)",
  "width": "number in metres (1-500)",
  "length": "number in metres (1-500)",
  "height": "number in metres per floor (2-20)",
  "rooms": [
    {
      "name": "string (1-100 chars)",
      "area": "number in m² (1-10000)"
    }
  ]
}
```

## Example

```json
{
  "type": "building",
  "name": "Immeuble Résidentiel Dakar",
  "floors": 5,
  "width": 20,
  "length": 30,
  "height": 3.5,
  "rooms": [
    { "name": "Salon", "area": 25 },
    { "name": "Chambre principale", "area": 18 },
    { "name": "Chambre 2", "area": 14 },
    { "name": "Cuisine", "area": 10 },
    { "name": "Salle de bain", "area": 6 }
  ]
}
```

## Field Rules

| Field   | Type    | Required | Constraints              | Description                    |
|---------|---------|----------|--------------------------|--------------------------------|
| type    | string  | ✅       | must be `"building"`     | Type de structure BIM          |
| name    | string  | ✅       | 1–255 chars              | Nom du bâtiment                |
| floors  | integer | ✅       | 1–100                    | Nombre d'étages                |
| width   | number  | ✅       | 1–500 (mètres)           | Largeur du bâtiment            |
| length  | number  | ✅       | 1–500 (mètres)           | Longueur du bâtiment           |
| height  | number  | ✅       | 2–20 (mètres par étage)  | Hauteur de chaque étage        |
| rooms   | array   | ❌       | max 100 rooms            | Liste des pièces (optionnel)   |

## Detection by Frontend

The frontend (`useStreamChat`) detects BIM JSON in the assistant's response by:
1. Attempting `JSON.parse()` on content wrapped in markdown code blocks (` ```json ... ``` `)
2. Checking if the parsed object has `type === "building"`
3. If detected → sets `bimDetected = true`, exposes `bimData` for `<BIMPreviewCard>`

## Flow (ADR-011)

```
Claude API → streaming chunks → NestJS assembles full content
→ Detects JSON BIM in content
→ Persists Message { role: ASSISTANT, content, bimData } to DB  ← BEFORE calling bim-service
→ Returns stream response to frontend
→ Frontend shows BIMPreviewCard
→ User clicks "Générer IFC"
→ Frontend calls POST /api/bim/generate { bimData }
→ NestJS proxies to bim-service/generate
→ bim-service generates IFC + uploads to S3
→ Returns { s3Key, downloadUrl }
```

## Validation Endpoint

`POST /validate` on bim-service returns:

```json
{
  "valid": true,
  "errors": []
}
```

or on failure:

```json
{
  "valid": false,
  "errors": ["floors must be between 1 and 100", "width is required"]
}
```
