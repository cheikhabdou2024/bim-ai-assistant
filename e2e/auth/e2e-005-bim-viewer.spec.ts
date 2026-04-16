import { test, expect, type APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Unique credentials per run to avoid collisions with other test suites
const timestamp = Date.now();
const TEST_USER = {
  name: 'Mamadou Sow',
  email: `e2e-bim-${timestamp}@test.com`,
  password: 'Password123!',
};

// ---------------------------------------------------------------------------
// Shared state (populated in beforeAll, used across tests)
// ---------------------------------------------------------------------------
let accessToken: string;
let projectId: string;
let projectName: string;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register, then login, return the access token. */
async function registerAndLogin(request: APIRequestContext): Promise<string> {
  // Register
  const registerRes = await request.post(`${API_URL}/api/auth/register`, {
    data: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });
  // 201 on first run; 409 if email already exists (re-run scenario) — both are OK
  expect([201, 409]).toContain(registerRes.status());

  // Login
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });
  expect(loginRes.status()).toBe(200);

  const body = await loginRes.json();
  // The API may return the token under `accessToken` or nested in `data`
  const token: string = body.accessToken ?? body.data?.accessToken ?? body.token;
  expect(token).toBeTruthy();
  return token;
}

/** Create a project via the REST API and return its id and name. */
async function createProject(
  request: APIRequestContext,
  token: string,
): Promise<{ id: string; name: string }> {
  const name = `Projet BIM E2E ${timestamp}`;
  const res = await request.post(`${API_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'Projet créé automatiquement par le test E2E TC-E2E-018→022',
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  const id: string = body.id ?? body.data?.id;
  expect(id).toBeTruthy();
  return { id, name };
}

/** Delete the project via the REST API (best-effort cleanup). */
async function deleteProject(request: APIRequestContext, token: string, id: string): Promise<void> {
  await request.delete(`${API_URL}/api/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Ignore the response status — cleanup is best-effort
}

/** Log in through the UI so that the in-memory token + httpOnly cookie are set. */
async function loginViaUI(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// ===========================================================================
// Test suite — TC-E2E-018 → TC-E2E-022
// ===========================================================================

test.describe('E2E-005 — BIM Viewer : ProjectModelsPanel', () => {
  // -------------------------------------------------------------------------
  // Setup : create a user + project once for the whole suite
  // -------------------------------------------------------------------------
  test.beforeAll(async ({ request }) => {
    accessToken = await registerAndLogin(request);
    const project = await createProject(request, accessToken);
    projectId = project.id;
    projectName = project.name;
  });

  // -------------------------------------------------------------------------
  // Teardown : delete the project (best-effort)
  // -------------------------------------------------------------------------
  test.afterAll(async ({ request }) => {
    if (projectId) {
      await deleteProject(request, accessToken, projectId);
    }
  });

  // =========================================================================
  // TC-E2E-018 — Ouvrir le panel "Modèles BIM" depuis le dashboard
  // =========================================================================
  test('TC-E2E-018 — Clic "Modèles BIM" sur une ProjectCard → panel s\'ouvre avec le titre "Modèles BIM"', async ({
    page,
  }) => {
    await loginViaUI(page);

    // Locate the project card that contains the project we just created
    const projectCard = page
      .locator('[data-testid="project-card"]')
      .filter({ hasText: projectName })
      .first();

    // Fall back to the generic rounded card class if data-testid is absent
    const card = (await projectCard.count()) > 0
      ? projectCard
      : page.locator('.rounded-2xl').filter({ hasText: projectName }).first();

    await expect(card).toBeVisible({ timeout: 10_000 });

    // Click the "Modèles BIM" button inside this card
    await card.getByRole('button', { name: /modèles bim/i }).click();

    // The slide-over panel must appear and contain the heading
    await expect(page.getByText(/modèles bim/i).first()).toBeVisible({ timeout: 5_000 });
  });

  // =========================================================================
  // TC-E2E-019 — Projet sans modèle → message "Aucun modèle BIM"
  // =========================================================================
  test('TC-E2E-019 — Panel modèles d\'un projet sans modèle BIM → affiche "Aucun modèle BIM"', async ({
    page,
  }) => {
    await loginViaUI(page);

    const projectCard = page
      .locator('[data-testid="project-card"]')
      .filter({ hasText: projectName })
      .first();

    const card = (await projectCard.count()) > 0
      ? projectCard
      : page.locator('.rounded-2xl').filter({ hasText: projectName }).first();

    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: /modèles bim/i }).click();

    // Panel is visible
    await expect(page.getByText(/modèles bim/i).first()).toBeVisible({ timeout: 5_000 });

    // No models yet → empty-state message
    await expect(
      page.getByText(/aucun modèle bim/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  // =========================================================================
  // TC-E2E-020 — Fermer le panel via le bouton X
  // =========================================================================
  test('TC-E2E-020 — Bouton "Fermer" (×) ferme le panel de modèles BIM', async ({ page }) => {
    await loginViaUI(page);

    const projectCard = page
      .locator('[data-testid="project-card"]')
      .filter({ hasText: projectName })
      .first();

    const card = (await projectCard.count()) > 0
      ? projectCard
      : page.locator('.rounded-2xl').filter({ hasText: projectName }).first();

    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: /modèles bim/i }).click();

    // Confirm panel is open
    await expect(page.getByText(/modèles bim/i).first()).toBeVisible({ timeout: 5_000 });

    // Click the close button (aria-label="Fermer")
    await page.locator('button[aria-label="Fermer"]').click();

    // The panel (and its title) must disappear
    await expect(page.getByText(/modèles bim/i).first()).toBeHidden({ timeout: 5_000 });
  });

  // =========================================================================
  // TC-E2E-021 — Fermer le panel en cliquant l'overlay (clic en dehors)
  // =========================================================================
  test('TC-E2E-021 — Clic sur l\'overlay ferme le panel de modèles BIM', async ({ page }) => {
    await loginViaUI(page);

    const projectCard = page
      .locator('[data-testid="project-card"]')
      .filter({ hasText: projectName })
      .first();

    const card = (await projectCard.count()) > 0
      ? projectCard
      : page.locator('.rounded-2xl').filter({ hasText: projectName }).first();

    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: /modèles bim/i }).click();

    // Confirm panel is open
    await expect(page.getByText(/modèles bim/i).first()).toBeVisible({ timeout: 5_000 });

    // Click outside the panel — top-left corner of the viewport is safely in
    // the overlay area (the panel slides in from the right)
    await page.mouse.click(80, 80);

    // The panel must disappear
    await expect(page.getByText(/modèles bim/i).first()).toBeHidden({ timeout: 5_000 });
  });

  // =========================================================================
  // TC-E2E-022 — Vérifier l'appel API /api/bim/projects/:id/models
  // =========================================================================
  test('TC-E2E-022 — Ouvrir le panel déclenche GET /api/bim/projects/:id/models', async ({
    page,
  }) => {
    await loginViaUI(page);

    // Intercept the BIM models request BEFORE opening the panel
    const bimModelsRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/bim/projects/') &&
        req.url().includes('/models') &&
        req.method() === 'GET',
      { timeout: 10_000 },
    );

    const projectCard = page
      .locator('[data-testid="project-card"]')
      .filter({ hasText: projectName })
      .first();

    const card = (await projectCard.count()) > 0
      ? projectCard
      : page.locator('.rounded-2xl').filter({ hasText: projectName }).first();

    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: /modèles bim/i }).click();

    // Confirm panel opened
    await expect(page.getByText(/modèles bim/i).first()).toBeVisible({ timeout: 5_000 });

    // The API call must have fired
    const bimRequest = await bimModelsRequestPromise;
    expect(bimRequest.url()).toContain(`/bim/projects/${projectId}/models`);
  });
});
