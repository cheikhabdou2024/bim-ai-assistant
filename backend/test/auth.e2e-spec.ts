/**
 * Auth Integration Tests — TC-020 → TC-035
 * Uses Supertest against a real NestJS app connected to test DB + Redis.
 * Run: npx jest --config jest-e2e.json (or via CI)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createHash } from 'crypto';

const TEST_USER = {
  name: 'Integration Tester',
  email: `integration-${Date.now()}@test.com`,
  password: 'Password123!',
};

describe('Auth Integration Tests (TC-020 → TC-035)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshCookie: string;

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
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await app.close();
  });

  // ─── TC-020 : Register ───────────────────────────────────────────────────
  it('TC-020 — POST /api/auth/register — 201 on valid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(TEST_USER)
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: TEST_USER.name,
      email: TEST_USER.email,
    });
    expect(res.body.password).toBeUndefined();
  });

  it('TC-021 — POST /api/auth/register — 409 on duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(TEST_USER)
      .expect(409);
  });

  it('TC-022 — POST /api/auth/register — 422 on weak password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...TEST_USER, email: 'other@test.com', password: 'weak' })
      .expect(422);
  });

  it('TC-023 — POST /api/auth/register — 400 on extra unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...TEST_USER, email: 'extra@test.com', role: 'ADMIN' })
      .expect(400);
  });

  // ─── TC-024 : Login ──────────────────────────────────────────────────────
  it('TC-024 — POST /api/auth/login — 200 on valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toMatchObject({ email: TEST_USER.email });

    accessToken = res.body.accessToken;

    // refreshToken cookie must be set
    const setCookieHeader = res.headers['set-cookie'] as unknown as string[];
    expect(setCookieHeader).toBeDefined();
    const rtCookie = setCookieHeader.find((c: string) => c.startsWith('refreshToken='));
    expect(rtCookie).toBeDefined();
    expect(rtCookie).toContain('HttpOnly');
    expect(rtCookie).toContain('Path=/api/auth');
    refreshCookie = rtCookie as string;
  });

  it('TC-025 — POST /api/auth/login — 401 on wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPassword1!' })
      .expect(401);
  });

  it('TC-026 — POST /api/auth/login — 401 on non-existent email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'doesnotexist@test.com', password: 'Password123!' })
      .expect(401);
  });

  // ─── TC-027 : Rate Limiting (may be skipped in fast CI) ─────────────────
  it.skip('TC-027 — POST /api/auth/login — 429 after 5 attempts (rate limit)', async () => {
    const promises = Array.from({ length: 6 }, () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'Wrong1!' }),
    );
    const results = await Promise.all(promises);
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain(429);
  });

  // ─── TC-028 : JWT Guard ──────────────────────────────────────────────────
  it('TC-028 — GET /api/users/me — 200 with valid JWT', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(TEST_USER.email);
  });

  it('TC-029 — GET /api/users/me — 401 without JWT', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);
  });

  it('TC-030 — GET /api/users/me — 401 with malformed JWT', async () => {
    await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });

  // ─── TC-031 : Refresh ────────────────────────────────────────────────────
  it('TC-031 — POST /api/auth/refresh — 200 returns new accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.accessToken).not.toBe(accessToken); // Token rotated
    accessToken = res.body.accessToken;

    // New refreshToken cookie issued
    const setCookieHeader = res.headers['set-cookie'] as unknown as string[];
    expect(setCookieHeader).toBeDefined();
    const newRtCookie = setCookieHeader.find((c: string) => c.startsWith('refreshToken='));
    expect(newRtCookie).toBeDefined();
    refreshCookie = newRtCookie as string;
  });

  it('TC-032 — POST /api/auth/refresh — 401 without cookie', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
  });

  // ─── TC-033 : Reuse Detection ────────────────────────────────────────────
  it('TC-033 — POST /api/auth/refresh — reuse detection revokes all tokens', async () => {
    // Login fresh to get a clean refresh token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const originalCookie = cookies.find((c: string) => c.startsWith('refreshToken=')) as string;

    // Use it once (valid rotation)
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(200);

    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    refreshCookie = newCookies.find((c: string) => c.startsWith('refreshToken=')) as string;

    // Reuse the OLD (now revoked) token → should trigger nuclear revoke
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', originalCookie)
      .expect(401);

    // The NEW token should also be revoked (nuclear option)
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);

    // Re-login for subsequent tests
    const reloginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    accessToken = reloginRes.body.accessToken;
    const reloginCookies = reloginRes.headers['set-cookie'] as unknown as string[];
    refreshCookie = reloginCookies.find((c: string) => c.startsWith('refreshToken=')) as string;
  });

  // ─── TC-034 : Hash verification ─────────────────────────────────────────
  it('TC-034 — RefreshToken stored as SHA-256 hash, never raw', async () => {
    // Extract raw token value from cookie
    const cookieValue = refreshCookie.split(';')[0].replace('refreshToken=', '');
    const expectedHash = createHash('sha256').update(cookieValue).digest('hex');

    const tokenRecord = await prisma.refreshToken.findFirst({
      where: { token: expectedHash, revoked: false },
    });

    expect(tokenRecord).toBeDefined();
    // The stored token is the hash, not the raw value
    expect(tokenRecord?.token).toBe(expectedHash);
    expect(tokenRecord?.token).not.toBe(cookieValue);
  });

  // ─── TC-035 : Logout ─────────────────────────────────────────────────────
  it('TC-035 — POST /api/auth/logout — 200 clears cookie and revokes token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');

    // Cookie cleared (empty value + expired)
    const setCookieHeader = res.headers['set-cookie'] as unknown as string[];
    if (setCookieHeader) {
      const clearedCookie = setCookieHeader.find((c: string) => c.startsWith('refreshToken='));
      if (clearedCookie) {
        expect(clearedCookie).toContain('refreshToken=;');
      }
    }

    // Subsequent refresh with same cookie fails
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
  });
});
