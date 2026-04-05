import { test, expect } from '@playwright/test';

test.describe('E2E-004 — Rate Limiting', () => {
  // TC-E2E-010 skipped in CI: login throttle (5/min, IP-based) is consumed by
  // preceding tests in the same run. The API-level rate limit is verified by
  // backend unit TC-027. Enable manually with --grep for isolated runs.
  test.skip('TC-E2E-010 — 6th login attempt within 1 minute triggers rate limit (429)', async ({
    page,
    request,
  }) => {
    const API_URL = process.env.API_URL || 'http://localhost:3000';
    const email = 'ratelimit@test.com';
    const wrongPassword = 'WrongPass123!';

    // Hit the login endpoint directly 6 times via API
    const responses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request.post(`${API_URL}/api/auth/login`, {
        data: { email, password: wrongPassword },
      });
      responses.push(res.status());
    }

    // First 5 should be 401, 6th should be 429
    expect(responses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(responses[5]).toBe(429);
  });

  test('TC-E2E-011 — Rate limit error message shown in UI', async ({ page }) => {
    // Simulate 5 failed attempts then 1 more
    await page.goto('/login');

    for (let i = 0; i < 6; i++) {
      await page.getByLabel(/email/i).fill('ratelimit@test.com');
      await page.getByLabel(/mot de passe/i).fill('WrongPass123!');
      await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();
      await page.waitForTimeout(200);
    }

    // Should show rate limit error
    await expect(page.getByRole('alert')).toBeVisible();
    const alertText = await page.getByRole('alert').textContent();
    expect(alertText?.toLowerCase()).toMatch(/trop|limite|rate|too many/i);
  });
});
