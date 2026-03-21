import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3000';

const TEST_USER = {
  name: 'Aliou Diallo',
  email: `e2e-${Date.now()}@test.com`,
  password: 'Password123!',
};

test.describe('E2E-001 — Register → Login flow', () => {
  test('TC-E2E-001 — Register new user and redirect to dashboard', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);

    await page.getByLabel(/nom/i).fill(TEST_USER.name);
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /créer|register|s'inscrire/i }).click();

    // After register → redirect to login or dashboard
    await expect(page).toHaveURL(/\/(login|dashboard)/);
  });

  test('TC-E2E-002 — Login and verify JWT stored in-memory, not localStorage', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    // Access token must NOT be in localStorage (security requirement)
    const localStorageToken = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.find((k) => k.toLowerCase().includes('token'));
    });
    expect(localStorageToken).toBeUndefined();
  });

  test('TC-E2E-003 — refreshToken cookie is httpOnly and scoped to /api/auth', async ({ page, context }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // httpOnly cookies are not accessible via JS — verify by trying
    const cookieViaJS = await page.evaluate(() => {
      return document.cookie.includes('refreshToken');
    });
    expect(cookieViaJS).toBe(false);

    // Verify via Playwright context cookies (server-side visibility)
    const cookies = await context.cookies();
    const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.httpOnly).toBe(true);
    expect(refreshCookie?.path).toBe('/api/auth');
  });

  test('TC-E2E-004 — Redirect unauthenticated user to login', async ({ page }) => {
    // Clear cookies to simulate logged-out state
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-E2E-005 — Wrong credentials show error toast', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/mot de passe/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();

    // Should stay on login and show error
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
