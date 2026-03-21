# Dev Guidelines — BIM AI Assistant

> **Règle d'or :** Un développeur doit pouvoir lire le code d'un autre sans surprise.
> Ces conventions sont obligatoires pour tous les agents.

---

## 1. Conventions Générales

### Nommage
| Élément | Convention | Exemple |
|---------|-----------|---------|
| Composant React | PascalCase | `ProjectCard.tsx` |
| Hook custom | camelCase + "use" | `useProjects.ts` |
| Service NestJS | camelCase + "Service" | `projectsService.ts` |
| DTO | PascalCase + "Dto" | `CreateProjectDto` |
| Interface TypeScript | PascalCase (pas de "I") | `Project`, `User` |
| Constante | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Fichier (kebab) | kebab-case | `project-card.tsx` |

### TypeScript — Règles strictes
```typescript
// ❌ INTERDIT
const data: any = {};
function doSomething(param) {}
const user = response.data;

// ✅ OBLIGATOIRE
const data: ProjectData = {};
function doSomething(param: string): void {}
const user: User = response.data;
```

---

## 2. Frontend (React)

### Structure d'un composant
```typescript
// Ordre obligatoire dans un composant
export const MyComponent: FC<Props> = ({ prop1, prop2 }) => {
  // 1. useState
  const [state, setState] = useState<Type>(initial);

  // 2. useQuery / useMutation (React Query)
  const { data, isLoading } = useQuery({ queryKey: ['key'], queryFn: fn });

  // 3. useEffect (si nécessaire)
  useEffect(() => { }, [dependency]);

  // 4. Handlers (useCallback si passé en props)
  const handleClick = useCallback(() => { }, []);

  // 5. Early returns
  if (isLoading) return <Spinner />;
  if (!data) return null;

  // 6. Render
  return <div>...</div>;
};
```

### Data fetching — React Query uniquement
```typescript
// ❌ useEffect pour fetcher = INTERDIT
useEffect(() => {
  fetch('/api/projects').then(r => r.json()).then(setProjects);
}, []);

// ✅ React Query obligatoire
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: projectsApi.getAll,
  staleTime: 30_000,
});
```

### Formulaires — React Hook Form + Zod
```typescript
// Toujours définir le schema Zod d'abord
const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### Performance — Règles
```typescript
// Memoize les composants qui reçoivent des props stables
export const ExpensiveList = memo(({ items }: Props) => { ... });

// Memoize les valeurs calculées lourdes
const sorted = useMemo(() => items.sort(compareFn), [items]);

// Memoize les callbacks passés en props
const handleSelect = useCallback((id: string) => { ... }, [dependency]);
```

### Structure dossiers Feature
```
src/features/[feature]/
├── components/     # Composants React de la feature
├── hooks/          # Hooks spécifiques
├── api/            # Appels API (fonctions async)
├── store/          # Zustand slice (si état global nécessaire)
├── types.ts        # Types TypeScript de la feature
└── index.ts        # Exports publics de la feature
```

---

## 3. Backend (NestJS)

### Pattern Controller → Service → Prisma
```typescript
// Controller : routing + validation + auth uniquement
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@User('id') userId: string) {
    return this.projectsService.findAll(userId); // Délègue au service
  }
}

// Service : logique métier uniquement
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
```

### DTOs — Validation obligatoire
```typescript
// Toujours valider les inputs avec class-validator
export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
```

### Sécurité — Non négociable
- Toutes les routes protégées par `@UseGuards(JwtAuthGuard)`
- Toujours vérifier `userId` avant update/delete (ownership)
- Jamais de données utilisateur croisées
- Rate limiting sur routes sensibles (auth surtout)

### Gestion erreurs standardisée
```typescript
// Utiliser les exceptions NestJS standards
throw new NotFoundException(`Project ${id} not found`);
throw new ForbiddenException('Access denied');
throw new BadRequestException('Invalid data');
throw new ConflictException('Email already exists');
```

---

## 4. BIM Service (Python)

### Validation Pydantic avant toute génération
```python
# Toujours valider AVANT de générer l'IFC
class Wall(BaseModel):
    thickness: float

    @validator('thickness')
    def check_thickness(cls, v):
        if v < 0.1:
            raise ValueError('Épaisseur minimum : 0.1m')
        return v
```

### Hiérarchie IFC obligatoire
```
IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey → Éléments
```
Ne jamais créer un élément sans l'attacher à la hiérarchie.

---

## 5. Base de Données

### Prisma — Bonnes pratiques
```prisma
// Toujours : uuid, timestamps, index sur FK
model Project {
  id          String    @id @default(uuid())
  name        String
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("projects")
  @@index([userId])        // Index sur FK obligatoire
}
```

### Règles
- UUID sur tous les IDs (pas d'auto-increment)
- `createdAt` + `updatedAt` sur toutes les tables
- Index sur toutes les foreign keys
- `@@map` en snake_case pour les noms de table

---

## 6. Git & Branches

### Nommage des branches
```
feature/[description-courte]    → nouvelle feature
fix/[description-bug]           → bug fix
chore/[description]             → maintenance
```

### Commits (Conventional Commits)
```
feat: add AI chat streaming
fix: resolve IFC generation error on walls
chore: update dependencies
docs: add API contracts documentation
test: add E2E tests for login flow
```

### Pull Requests
- 1 PR = 1 feature ou 1 fix
- Maximum 400 lignes changées (découper si plus)
- CI doit passer avant merge
- 1 review minimum (Tech Lead ou Senior)

---

## 7. Tests

### Couverture minimale
| Type | Outil | Cible |
|------|-------|-------|
| Unit (composants React) | Vitest + Testing Library | > 80% |
| Unit (services NestJS) | Jest | > 80% |
| Integration (API) | Jest + Supertest | Routes critiques |
| E2E | Playwright | Parcours utilisateurs MVP |
| Performance | Artillery | p95 < 200ms API |

### Règle : Tests before merge
Aucun merge sur `develop` sans tests passants et coverage maintenu.

---

## 8. Documentation API

Swagger obligatoire sur TOUS les endpoints :
```typescript
@ApiTags('Projects')
@ApiOperation({ summary: 'List all user projects' })
@ApiResponse({ status: 200, type: [ProjectDto] })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Get()
findAll() { ... }
```

Swagger UI accessible sur : `/api/docs` (staging)
