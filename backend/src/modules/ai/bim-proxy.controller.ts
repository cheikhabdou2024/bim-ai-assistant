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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
  @ApiOperation({ summary: 'Validate BIM JSON structure via bim-service' })
  @ApiResponse({ status: 200, description: '{ valid: boolean, errors: string[] }' })
  validate(
    @CurrentUser() _user: { sub: string },
    @Body() body: { bimData: object },
  ) {
    return this.proxyToBimService('/validate', body.bimData, 10000);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate IFC file from BIM JSON + upload to S3' })
  @ApiResponse({ status: 201, description: '{ s3Key: string, downloadUrl: string }' })
  generate(
    @CurrentUser() _user: { sub: string },
    @Body() body: { bimData: object },
  ) {
    // 35s timeout — IFC generation is CPU-intensive
    return this.proxyToBimService('/generate', body.bimData, 35000);
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
  @ApiOperation({ summary: 'Get presigned S3 URL to download an IFC model' })
  @ApiResponse({ status: 200, description: '{ url: string, expiresIn: number }' })
  @ApiResponse({ status: 404, description: 'Model not found or access denied' })
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
   * GET /api/projects/:projectId/models
   * Lists all BIM models for a project.
   * ADR-014: two-level ownership — verify Project belongs to user first.
   */
  @Get('/projects/:projectId/models')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'List BIM models for a project' })
  @ApiResponse({ status: 200, description: '{ data: BIMModel[] }' })
  @ApiResponse({ status: 404, description: 'Project not found or access denied' })
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
