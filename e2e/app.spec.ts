import { test, expect } from '@playwright/test';

// ─── API Health ────────────────────────────────────────────────────────────────
test.describe('Backend API', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('provider');
    expect(body).toHaveProperty('knowledgeBase');
    expect(body).toHaveProperty('availableProviders');
  });

  test('GET /api/config/provider returns active provider', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/config/provider');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(['claude', 'openai', 'gemini']).toContain(body.active);
    expect(Array.isArray(body.available)).toBe(true);
  });

  test('POST /api/chat rejects empty message', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/chat', {
      data: { message: '', sessionId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/chat rejects invalid sessionId', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/chat', {
      data: { message: 'Hello', sessionId: 'not-a-uuid' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/upload/url rejects private IP', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/upload/url', {
      data: { url: 'http://192.168.1.1/secret' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/private|internal/i);
  });

  test('POST /api/upload/url rejects localhost URL', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/upload/url', {
      data: { url: 'http://localhost/admin' },
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE /api/upload/:sourceId rejects non-UUID', async ({ request }) => {
    const res = await request.delete('http://localhost:4000/api/upload/../../etc/passwd');
    expect([400, 404]).toContain(res.status());
  });

  test('DELETE /api/chat/history/:sessionId rejects invalid ID', async ({ request }) => {
    const res = await request.delete('http://localhost:4000/api/chat/history/../../etc/passwd');
    expect([400, 404]).toContain(res.status());
  });

  test('Unknown API route returns 404', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/nonexistent');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/tts rejects overly long text', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/tts', {
      data: { text: 'a'.repeat(10000) },
    });
    expect(res.status()).toBe(400);
  });
});

// ─── Frontend UI ───────────────────────────────────────────────────────────────
test.describe('Frontend UI', () => {
  test('app loads and shows main layout', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Tutor|Tutor/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('chat input is visible and enabled', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test('knowledge base panel is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Knowledge Base/i).first()).toBeVisible();
  });

  test('AI Provider switcher shows provider options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/AI Provider/i).first()).toBeVisible();
    await expect(page.getByText(/Claude/i).first()).toBeVisible();
  });

  test('media player section is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Media Player/i).first()).toBeVisible();
  });

  test('file upload section is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Upload|Knowledge Base/i).first()).toBeVisible();
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const toggle = page.locator('button[title*="mode" i], button[title*="dark" i], button[title*="light" i]').first();
    if (await toggle.isVisible()) {
      const before = await html.getAttribute('class');
      await toggle.click();
      const after = await html.getAttribute('class');
      expect(before).not.toBe(after);
    }
  });

  test('typing in chat input works', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('textarea').first();
    await expect(input).toBeVisible();
    await input.fill('What is photosynthesis?');
    await expect(input).toHaveValue('What is photosynthesis?');
  });

  test('chat mode buttons are visible', async ({ page }) => {
    await page.goto('/');
    const modes = ['Explain', 'Quiz', 'Chat', 'Summarize', 'Flashcard'];
    let found = 0;
    for (const mode of modes) {
      const el = page.getByText(new RegExp(mode, 'i')).first();
      if (await el.isVisible().catch(() => false)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(3);
  });

  test('upload tab switches between File and URL', async ({ page }) => {
    await page.goto('/');
    const urlTab = page.getByText(/URL/i).first();
    if (await urlTab.isVisible()) {
      await urlTab.click();
      const urlInput = page.locator('input[type="url"]').first();
      await expect(urlInput).toBeVisible();
    }
  });

  test('no JavaScript console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('ResizeObserver'));
    expect(critical).toHaveLength(0);
  });
});
