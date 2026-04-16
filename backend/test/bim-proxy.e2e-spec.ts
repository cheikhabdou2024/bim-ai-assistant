/**
 * BIM Proxy Integration Tests — TC-061 → TC-065
 * Tests the Sprint 4 endpoints:
 *   GET /api/bim/models/:id/download
 *   GET /api/bim/projects/:projectId/models
 *
 * Uses Supertest against real NestJS app (test DB + Redis).
 * AWS SDK and @anthropic-ai/sdk are mocked — no real external calls.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ── Mock @anthropic-ai/sdk before any imports resolve it ─────────────────────
// AppModule loads AiModule which imports Anthropic — must be mocked at top level.
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } };
        },
        finalMessage: jest.fn().mockResolvedValue({ usage: { input_tokens: 1, output_tokens: 1 } }),
      }),
    },
  })),
}));

// ── Mock AWS SDK — getSignedUrl returns a deterministic fake URL ──────────────
const FAKE_PRESIGNED_URL = 'https://s3.fake/test.ifc?X-Amz-Signature=abc123';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue(FAKE_PRESIGNED_URL),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
}));

// ── Mock global fetch for BIM proxy calls (generate / validate) ───────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─────────────────────────────────────────────────────────────────────────────

const TS = Date.now();
const USER_A = {
  name: 'BIM Tester A',
  email: `bim-proxy-a-${TS}@test.com`,
  password: 'Password123!',
};
const USER_B = {
  name: 'BIM Tester B',
  email: `bim-proxy-b-${TS}@test.com`,
  password: 'Password123!',
};

describe('BIM Proxy Integration Tests (TC-061 → TC-065)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Auth tokens
  let tokenA: string;
  let tokenB: string;

  // IDs created during setup — cleaned up in afterAll
  let userAId: string;
  let userBId: string;
  let projectAId: string;
  let projectBId: string;
  let modelAId: string;   // belongs to userA + projectA, has s3Key
  let modelBId: string;   // belongs to userB + projectB

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
          const hasUnknownField = errors.some(
            (e) => e.constraints && 'whitelistValidation' in e.constraints,
          );
          const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
          return hasUnknownField
            ? new BadRequestException(messages)
            : new UnprocessableEntityException(messages);
        },
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // ── Register + login User A ──
    await request(app.getHttpServer()).post('/api/auth/register').send(USER_A);
    const resA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: USER_A.email, password: USER_A.password });
    tokenA = resA.body.accessToken as string;

    const dbUserA = await prisma.user.findUniqueOrThrow({ where: { email: USER_A.email } });
    userAId = dbUserA.id;

    // ── Register + login User B ──
    await request(app.getHttpServer()).post('/api/auth/register').send(USER_B);
    const resB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: USER_B.email, password: USER_B.password });
    tokenB = resB.body.accessToken as string;

    const dbUserB = await prisma.user.findUniqueOrThrow({ where: { email: USER_B.email } });
    userBId = dbUserB.id;

    // ── Create projects directly via Prisma ──
    const projectA = await prisma.project.create({
      data: { name: 'Project Alpha', userId: userAId },
    });
    projectAId = projectA.id;

    const projectB = await prisma.project.create({
      data: { name: 'Project Beta', userId: userBId },
    });
    projectBId = projectB.id;

    // ── Create BIMModels directly via Prisma ──
    const modelA = await prisma.bIMModel.create({
      data: {
        userId: userAId,
        projectId: projectAId,
        s3Key: 'models/test-model-a.ifc',
        fileName: 'test-model-a.ifc',
        status: 'DONE',
      },
    });
    modelAId = modelA.id;

    const modelB = await prisma.bIMModel.create({
      data: {
        userId: userBId,
        projectId: projectBId,
        s3Key: 'models/test-model-b.ifc',
        fileName: 'test-model-b.ifc',
        status: 'DONE',
      },
    });
    modelBId = modelB.id;
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────

  afterAll(async () => {
    // Delete in dependency order (models → projects → users)
    await prisma.bIMModel.deleteMany({
      where: { id: { in: [modelAId, modelBId].filter(Boolean) } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectAId, projectBId].filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [USER_A.email, USER_B.email] } },
    });
    await app.close();
  });

  // ── TC-061 ─────────────────────────────────────────────────────────────────
  it('TC-061: GET /api/bim/models/:id/download → 200 + { url, expiresIn } (owner)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/bim/models/${modelAId}/download`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('expiresIn');
    expect(typeof res.body.url).toBe('string');
    expect(res.body.url).toMatch(/^https?:\/\//);
    expect(typeof res.body.expiresIn).toBe('number');
    expect(res.body.expiresIn).toBeGreaterThan(0);
  });

  // ── TC-062 ─────────────────────────────────────────────────────────────────
  it('TC-062: GET /api/bim/models/:id/download → 404 if model does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const res = await request(app.getHttpServer())
      .get(`/api/bim/models/${nonExistentId}/download`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });

  // ── TC-063 ─────────────────────────────────────────────────────────────────
  it('TC-063: GET /api/bim/models/:id/download → 404 if model belongs to another user (isolation)', async () => {
    // modelAId belongs to userA — userB must NOT be able to retrieve the URL
    const res = await request(app.getHttpServer())
      .get(`/api/bim/models/${modelAId}/download`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  // ── TC-064 ─────────────────────────────────────────────────────────────────
  it('TC-064: GET /api/bim/projects/:projectId/models → 200 + { data: [...] } (owner)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/bim/projects/${projectAId}/models`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    // projectA has exactly one model (modelA)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const ids = (res.body.data as Array<{ id: string }>).map((m) => m.id);
    expect(ids).toContain(modelAId);
  });

  // ── TC-065 ─────────────────────────────────────────────────────────────────
  it('TC-065: GET /api/bim/projects/:projectId/models → 404 if project belongs to another user (isolation)', async () => {
    // projectAId belongs to userA — userB must NOT see its models
    const res = await request(app.getHttpServer())
      .get(`/api/bim/projects/${projectAId}/models`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});
