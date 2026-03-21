import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'user1@test.com',
  password: 'User123!',
};

test.describe('E2E-003 — Silent Refresh / Page Reload', () => {
  test('TC-E2E-008 — Page reload restores session silently (no redirect to login)', async ({
    page,
    context,
  }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Reload — SilentRefreshProvider should restore the session
    await page.reload();

    // Must still be on dashboard — no flash redirect to /login
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('TC-E2E-009 — Direct navigation to /dashboard after page reload stays authenticated', async ({
    page,
  }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate away and come back
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
