import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadGatewayException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BimDownloadUrlResponseDto } from './dto/bim-download-url-response.dto';
import { BimGenerateResponseDto } from './dto/bim-generate-response.dto';
import { BimModelsResponseDto } from './dto/bim-models-response.dto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { CurrentUser } from '../auth/decorators/user.decorator';

const PRESIGNED_URL_TTL = 900;   // 15 min — S3 URL expiry
const CACHE_URL_TTL    = 840;    // 14 min — Redis cache (60s margin before S3 expiry)
const CACHE_MODELS_TTL = 60;     // 1 min  — project models list

@ApiTags('bim')
@ApiBearerAuth()
@Controller('bim')
export class BimProxyController {
  private readonly logger = new Logger(BimProxyController.name);
  private readonly bimServiceUrl: string;
  private readonly s3Client: S3Client;
  private readonly s3Bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.bimServiceUrl =
      this.configService.get<string>('bimServiceUrl') ?? 'http://localhost:8000';

    const region = this.configService.get<string>('aws.region') ?? 'eu-west-1';
    this.s3Client = new S3Client({ region });
    this.s3Bucket = this.configService.get<string>('aws.s3Bucket') ?? '';
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async proxyToBimService(
    path: string,
    body: object,
    timeoutMs = 10000,
  ): Promise<object> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.bimServiceUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => 'BIM service error');
        throw new BadGatewayException(detail);
      }

      return response.json() as Promise<object>;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new BadGatewayException('BIM service timeout');
      }
      if (err instanceof BadGatewayException) throw err;
      this.logger.error('[BIM Proxy] Error:', err);
      throw new BadGatewayException('BIM service unavailable');
    } finally {
      clearTimeout(timer);
    }
  }

  private async generatePresignedUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.s3Bucket, Key: s3Key });
    return getSignedUrl(this.s3Client, command, { expiresIn: PRESIGNED_URL_TTL });
  }

  // ── Existing endpoints ─────────────────────────────────────────────────────

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Valider la structure BIM JSON via le bim-service Python',
    description: 'Envoie le JSON BIM au service Python (FastAPI) qui retourne la liste des erreurs de validation IFC.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bimData'],
      properties: {
        bimData: {
          type: 'object',
          description: 'Données BIM structurées extraites par l\'IA (JSON)',
          example: { buildingType: 'residential', floors: 3, dimensions: { width: 12, depth: 8, height: 9 } },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Résultat de validation — valid=true si aucune erreur',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        errors: { type: 'array', items: { type: 'string' }, example: [] },
      },
    },
  })
  @ApiResponse({ status: 502, description: 'bim-service indisponible ou timeout' })
  validate(
    @CurrentUser() _user: { sub: string },
    @Body() body: { bimData: object },
  ) {
    return this.proxyToBimService('/validate', body.bimData, 10000);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Générer un fichier IFC depuis le BIM JSON + upload S3',
    description:
      'Envoie le JSON BIM au service Python (FastAPI + IfcOpenShell). ' +
      'La génération IFC est CPU-intensive — timeout 35 secondes. ' +
      'Le fichier est uploadé sur S3 par le bim-service. ' +
      'Rate limit : 5 req/min (ADR-012).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bimData'],
      properties: {
        bimData: {
          type: 'object',
          description: 'Données BIM structurées extraites par l\'IA',
          example: { buildingType: 'residential', floors: 3, dimensions: { width: 12, depth: 8, height: 9 } },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fichier IFC généré et uploadé sur S3 avec succès',
    type: BimGenerateResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Rate limit dépassé — 5 générations par minute maximum' })
  @ApiResponse({ status: 502, description: 'bim-service indisponible ou timeout (35s)' })
  async generate(
    @CurrentUser() user: { sub: string },
    @Body() body: { bimData: object },
  ) {
    // 35s timeout — IFC generation is CPU-intensive
    const result = await this.proxyToBimService('/generate', body.bimData, 35000) as {
      s3Key: string;
      fileName: string;
      downloadUrl: string;
      status: string;
      floors: number;
    };

    // Persist the generated model in DB (userId only — no project context in chat)
    await this.prisma.bIMModel.create({
      data: {
        userId: user.sub,
        s3Key: result.s3Key,
        fileName: result.fileName,
        status: 'COMPLETED',
      },
    });

    // Invalidate user models cache
    await this.redis.del(`bim:models:user:${user.sub}`);

    return result;
  }

  // ── Sprint 4 endpoints ─────────────────────────────────────────────────────

  /**
   * GET /api/bim/models/:id/download
   * Returns a short-lived S3 presigned URL for the IFC file.
   * ADR-013: browser downloads directly from S3 (no backend proxy for binaries).
   * ADR-014: ownership check — only the model's owner can get the URL.
   */
  @Get('models/:id/download')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Obtenir une URL présignée S3 pour télécharger un modèle IFC',
    description:
      'Retourne une URL S3 présignée valide 15 minutes (900 secondes). ' +
      'L\'URL est mise en cache dans Redis 14 minutes pour éviter des appels AWS répétés. ' +
      'Seul le propriétaire du modèle peut obtenir l\'URL (ADR-014). ' +
      'Rate limit : 10 req/min.',
  })
  @ApiParam({ name: 'id', description: 'UUID du modèle BIM', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'URL présignée S3 générée (valide 15 min)',
    type: BimDownloadUrlResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Modèle introuvable ou accès refusé (ownership check ADR-014)' })
  @ApiResponse({ status: 502, description: 'Erreur de génération de l\'URL S3 (AWS SDK)' })
  async getDownloadUrl(
    @CurrentUser() user: { sub: string },
    @Param('id') modelId: string,
  ) {
    // Ownership check — returns null (not throws) if not found / wrong user
    const model = await this.prisma.bIMModel.findFirst({
      where: { id: modelId, userId: user.sub },
    });

    if (!model || !model.s3Key) {
      throw new NotFoundException('Model not found');
    }

    // Cache presigned URL in Redis to avoid re-calling AWS SDK on every click
    const cacheKey = `bim:download-url:${modelId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { url: cached, expiresIn: PRESIGNED_URL_TTL };
    }

    const url = await this.generatePresignedUrl(model.s3Key);
    await this.redis.setex(cacheKey, CACHE_URL_TTL, url);

    return { url, expiresIn: PRESIGNED_URL_TTL };
  }

  /**
   * GET /api/bim/models
   * Lists ALL BIM models belonging to the current user.
   * Used by the models panel (chat has no project context).
   */
  @Get('/models')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getMyModels(@CurrentUser() user: { sub: string }) {
    const cacheKey = `bim:models:user:${user.sub}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { data: JSON.parse(cached) as unknown[] };
    }

    const models = await this.prisma.bIMModel.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      select: { id: true, s3Key: true, fileName: true, status: true, createdAt: true },
    });

    await this.redis.setex(cacheKey, CACHE_MODELS_TTL, JSON.stringify(models));
    return { data: models };
  }

  /**
   * GET /api/projects/:projectId/models
   * Lists all BIM models for a project.
   * ADR-014: two-level ownership — verify Project belongs to user first.
   */
  @Get('/projects/:projectId/models')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Lister les modèles BIM d\'un projet',
    description:
      'Retourne tous les modèles BIM d\'un projet (triés par date décroissante). ' +
      'Vérification double niveau : le projet doit appartenir à l\'utilisateur courant (ADR-014). ' +
      'La liste est mise en cache dans Redis 1 minute (CACHE_MODELS_TTL). ' +
      'Rate limit : 30 req/min.',
  })
  @ApiParam({ name: 'projectId', description: 'UUID du projet', example: 'proj-uuid-1234-5678-abcd' })
  @ApiResponse({
    status: 200,
    description: 'Liste des modèles BIM du projet (depuis Redis cache ou PostgreSQL)',
    type: BimModelsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Projet introuvable ou accès refusé (ownership check ADR-014)' })
  async getProjectModels(
    @CurrentUser() user: { sub: string },
    @Param('projectId') projectId: string,
  ) {
    // Two-level ownership (ADR-014): verify project belongs to user
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId: user.sub },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const cacheKey = `bim:models:${projectId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { data: JSON.parse(cached) as unknown[] };
    }

    const models = await this.prisma.bIMModel.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, s3Key: true, fileName: true, status: true, createdAt: true },
    });

    await this.redis.setex(cacheKey, CACHE_MODELS_TTL, JSON.stringify(models));

    return { data: models };
  }
}
