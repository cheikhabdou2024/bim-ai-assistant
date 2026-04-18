import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_URL = process.env.API_URL || 'http://localhost:3000';

const timestamp = Date.now();
const TEST_USER = {
  name:     'Fatou Ndiaye',
  email:    `e2e-bim-gen-${timestamp}@test.com`,
  password: 'Password123!',
};

// Minimal valid BIM JSON that the mock bim-service will accept
const MOCK_BIM_JSON = {
  type:   'building',
  name:   'Villa E2E',
  floors: 2,
  width:  10,
  length: 12,
  height: 3.0,
  rooms:  [{ name: 'Salon', area: 25 }],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerAndLogin(request: APIRequestContext): Promise<string> {
  await request.post(`${API_URL}/api/auth/register`, { data: TEST_USER });
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: TEST_USER.email, password: TEST_USER.password },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const token: string = body.accessToken ?? body.data?.accessToken ?? body.token;
  expect(token).toBeTruthy();
  return token;
}

async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/mot de passe/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /connexion|login|se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Suite — TC-E2E-023 → TC-E2E-027
// ---------------------------------------------------------------------------

test.describe('E2E-006 — BIM Generation full flow (chat → IFC → download)', () => {
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    accessToken = await registerAndLogin(request);
  });

  test.afterAll(async ({ request }) => {
    // Best-effort cleanup — delete generated models + user
    await request.delete(`${API_URL}/api/auth/account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => { /* ignore */ });
  });

  // =========================================================================
  // TC-E2E-023 — Navigate to Chat IA from dashboard
  // =========================================================================
  test('TC-E2E-023 — Dashboard → Chat IA navigation works', async ({ page }) => {
    await loginViaUI(page);

    await page.getByRole('link', { name: /chat ia/i }).click();
    await expect(page).toHaveURL(/\/chat/, { timeout: 5_000 });

    // Chat input must be visible
    await expect(
      page.getByRole('textbox').or(page.locator('textarea')).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  // =========================================================================
  // TC-E2E-024 — BIM card appears when AI returns BIM JSON
  // =========================================================================
  test('TC-E2E-024 — BIM preview card renders after AI response with BIM JSON', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/chat');

    // Intercept the SSE stream — inject a synthetic assistant reply containing BIM JSON
    await page.route('**/api/ai/chat/stream', async (route) => {
      const bimBlock = `\`\`\`json\n${JSON.stringify(MOCK_BIM_JSON, null, 2)}\n\`\`\``;
      const body = [
        `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Voici le modèle :\n' } })}\n\n`,
        `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: bimBlock } })}\n\n`,
        `data: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
      ].join('');

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
        },
        body,
      });
    });

    // Type a prompt and send
    const input = page.getByRole('textbox').or(page.locator('textarea')).first();
    await input.fill('Génère une villa 2 étages');
    await input.press('Enter');

    // BIM preview card must appear
    await expect(
      page.getByText(/modèle bim détecté/i),
    ).toBeVisible({ timeout: 10_000 });

    // Specs must be visible
    await expect(page.getByText(/villa e2e/i)).toBeVisible();
    await expect(page.getByText(/Générer le fichier IFC/i)).toBeVisible();
  });

  // =========================================================================
  // TC-E2E-025 — "Générer le fichier IFC" triggers POST /bim/generate
  // =========================================================================
  test('TC-E2E-025 — Clicking "Générer le fichier IFC" calls POST /bim/generate', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/chat');

    // Mock SSE to return BIM JSON
    await page.route('**/api/ai/chat/stream', async (route) => {
      const bimBlock = `\`\`\`json\n${JSON.stringify(MOCK_BIM_JSON, null, 2)}\n\`\`\``;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: [
          `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: bimBlock } })}\n\n`,
          `data: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
        ].join(''),
      });
    });

    // Mock validate → valid
    await page.route('**/api/bim/validate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, errors: [] }),
      });
    });

    // Capture generate request
    const generateRequestPromise = page.waitForRequest(
      (req) => req.url().includes('/bim/generate') && req.method() === 'POST',
      { timeout: 15_000 },
    );

    // Mock generate → success
    await page.route('**/api/bim/generate', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          s3Key:       'models/e2e-test.ifc',
          fileName:    'Villa_E2E.ifc',
          downloadUrl: 'https://cdn.example.com/e2e-test.ifc',
          status:      'COMPLETED',
          floors:      2,
        }),
      });
    });

    // Trigger SSE → wait for BIM card
    const input = page.getByRole('textbox').or(page.locator('textarea')).first();
    await input.fill('Génère une villa');
    await input.press('Enter');
    await expect(page.getByText(/modèle bim détecté/i)).toBeVisible({ timeout: 10_000 });

    // Click generate
    await page.getByRole('button', { name: /générer le fichier ifc/i }).click();

    const generateReq = await generateRequestPromise;
    expect(generateReq.url()).toContain('/bim/generate');
  });

  // =========================================================================
  // TC-E2E-026 — Success state shows download link
  // =========================================================================
  test('TC-E2E-026 — After successful generation the download link is visible', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/chat');

    // Mock all three endpoints
    await page.route('**/api/ai/chat/stream', async (route) => {
      const bimBlock = `\`\`\`json\n${JSON.stringify(MOCK_BIM_JSON, null, 2)}\n\`\`\``;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: bimBlock } })}\n\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
      });
    });

    await page.route('**/api/bim/validate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, errors: [] }) }),
    );

    await page.route('**/api/bim/generate', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          s3Key: 'models/e2e-test.ifc', fileName: 'Villa_E2E.ifc',
          downloadUrl: 'https://cdn.example.com/e2e-test.ifc',
          status: 'COMPLETED', floors: 2,
        }),
      }),
    );

    const input = page.getByRole('textbox').or(page.locator('textarea')).first();
    await input.fill('Génère une villa');
    await input.press('Enter');
    await expect(page.getByText(/modèle bim détecté/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /générer le fichier ifc/i }).click();

    // Success card must appear with download link
    await expect(
      page.getByRole('link', { name: /télécharger le fichier ifc/i }),
    ).toBeVisible({ timeout: 15_000 });

    // File name must be shown
    await expect(page.getByText(/Villa_E2E\.ifc/i)).toBeVisible();
  });

  // =========================================================================
  // TC-E2E-027 — Validation error shows contextual message (no retry)
  // =========================================================================
  test('TC-E2E-027 — BIM validation failure shows "Données BIM invalides" without retry', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/chat');

    await page.route('**/api/ai/chat/stream', async (route) => {
      const bimBlock = `\`\`\`json\n${JSON.stringify(MOCK_BIM_JSON, null, 2)}\n\`\`\``;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: bimBlock } })}\n\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
      });
    });

    // Validate returns errors
    await page.route('**/api/bim/validate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false, errors: ['height doit être ≤ 6.0 m'] }),
      }),
    );

    const input = page.getByRole('textbox').or(page.locator('textarea')).first();
    await input.fill('Génère une villa');
    await input.press('Enter');
    await expect(page.getByText(/modèle bim détecté/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /générer le fichier ifc/i }).click();

    // Error card — validation
    await expect(
      page.getByText(/données bim invalides/i),
    ).toBeVisible({ timeout: 10_000 });

    // No retry button (validation errors are not retryable)
    await expect(
      page.getByRole('button', { name: /réessayer/i }),
    ).toBeHidden();
  });
});
