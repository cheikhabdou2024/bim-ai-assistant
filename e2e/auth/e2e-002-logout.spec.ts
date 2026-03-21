import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'user1@test.com',
  password: 'User123!',
};

test.describe('E2E-002 — Logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('TC-E2E-006 — Logout clears session and redirects to login', async ({ page, context }) => {
    await page.getByRole('button', { name: /logout|déconnexion/i }).click();

    await expect(page).toHaveURL(/\/login/);

    // refreshToken cookie must be gone
    const cookies = await context.cookies();
    const refreshCookie = cookies.find((c) => c.name === 'refreshToken');
    expect(refreshCookie).toBeUndefined();
  });

  test('TC-E2E-007 — After logout, accessing dashboard redirects to login', async ({ page }) => {
    await page.getByRole('button', { name: /logout|déconnexion/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
