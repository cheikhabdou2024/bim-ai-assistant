/**
 * Chat + Conversations Integration Tests — TC-056 → TC-060
 * Uses Supertest against real NestJS app (test DB + Redis).
 * @anthropic-ai/sdk is mocked — no real API calls.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ── Mock @anthropic-ai/sdk before any imports resolve it ─────────────────────
function makeStreamEvents(chunks: string[]) {
  const events = chunks.map((text) => ({
    type: 'content_block_delta',
    delta: { type: 'text_delta', text },
  }));
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const e of events) yield e;
    },
    finalMessage: jest.fn().mockResolvedValue({ usage: { input_tokens: 10, output_tokens: 20 } }),
  };
}

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn().mockReturnValue(
        makeStreamEvents(['Bonjour ! Voici votre modèle BIM.']),
      ),
    },
  })),
}));

// ── Mock global fetch for BIM proxy calls ─────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─────────────────────────────────────────────────────────────────────────────

const TEST_USER_A = { name: 'Chat Tester A', email: `chat-a-${Date.now()}@test.com`, password: 'Password123!' };
const TEST_USER_B = { name: 'Chat Tester B', email: `chat-b-${Date.now()}@test.com`, password: 'Password123!' };

describe('Chat Integration Tests (TC-056 → TC-060)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;
  let convIdA: string;

  async function bootstrap() {
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
  }

  async function loginUser(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Test', email, password })
      .catch(() =>
        request(app.getHttpServer()).post('/api/auth/login').send({ email, password }),
      );

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

    return loginRes.body.accessToken;
  }

  beforeAll(async () => {
    await bootstrap();

    // Register + login both users
    await request(app.getHttpServer()).post('/api/auth/register').send(TEST_USER_A);
    await request(app.getHttpServer()).post('/api/auth/register').send(TEST_USER_B);

    const resA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USER_A.email, password: TEST_USER_A.password });
    tokenA = resA.body.accessToken;

    const resB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USER_B.email, password: TEST_USER_B.password });
    tokenB = resB.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_USER_A.email, TEST_USER_B.email] } },
    });
    await app.close();
  });

  // TC-059 — GET /conversations → 200 empty list initially
  it('TC-059: GET /api/conversations → 200 (empty list for new user)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/conversations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // TC-059b — POST /conversations → 201
  it('TC-059b: POST /api/conversations → 201 creates conversation', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/conversations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title');
    convIdA = res.body.id;
  });

  // TC-056 — POST /chat/stream → 200 SSE response
  it('TC-056: POST /api/chat/stream → 200 with SSE content-type', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Accept', 'text/event-stream')
      .send({ conversationId: convIdA, message: 'Décris un immeuble de 3 étages à Dakar' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });

  // TC-057 — POST /bim/generate → 201 (mocked bim-service)
  it('TC-057: POST /api/bim/generate → 201 with s3Key and downloadUrl', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        s3Key: 'models/test-uuid.ifc',
        downloadUrl: 'https://s3.eu-west-1.amazonaws.com/models/test-uuid.ifc?X-Amz-Expires=3600',
      }),
    } as Response);

    const bimData = {
      type: 'building',
      name: 'Immeuble Test',
      floors: 3,
      width: 20,
      length: 30,
      height: 3.5,
    };

    const res = await request(app.getHttpServer())
      .post('/api/bim/generate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ bimData });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('s3Key');
    expect(res.body).toHaveProperty('downloadUrl');
  });

  // TC-058 — POST /bim/validate → 200 valid
  it('TC-058: POST /api/bim/validate → 200 { valid: true }', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, errors: [] }),
    } as Response);

    const res = await request(app.getHttpServer())
      .post('/api/bim/validate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        bimData: { type: 'building', name: 'Test', floors: 2, width: 15, length: 20, height: 3 },
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  // TC-060 — DELETE /conversations/:id autre user → 404 (ADR-008)
  it('TC-060: DELETE /api/conversations/:id by non-owner → 404', async () => {
    // convIdA belongs to userA — userB should get 404
    const res = await request(app.getHttpServer())
      .delete(`/api/conversations/${convIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  // TC-060b — GET /conversations/:id non-owner → 404
  it('TC-060b: GET /api/conversations/:id by non-owner → 404', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/conversations/${convIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  // TC-059c — Unauthenticated request → 401
  it('TC-059c: GET /api/conversations without token → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/conversations');
    expect(res.status).toBe(401);
  });

  // TC-056b — POST /chat/stream with empty message → 422
  it('TC-056b: POST /api/chat/stream with empty message → 422', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ message: '' });

    expect([400, 422]).toContain(res.status);
  });
});
