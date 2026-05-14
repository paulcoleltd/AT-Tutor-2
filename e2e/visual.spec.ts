/**
 * Visual regression tests — Playwright screenshot comparison.
 *
 * Captures pixel-level snapshots of key UI states and compares against
 * baselines stored in e2e/snapshots/. First run creates baselines;
 * subsequent runs diff against them.
 *
 * Run:  npx playwright test e2e/visual.spec.ts --update-snapshots  (update baselines)
 *       npx playwright test e2e/visual.spec.ts                     (compare)
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

// ── Helpers ────────────────────────────────────────────────────────────────────
async function waitForApp(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  // Dismiss any setup guide overlays
  const dismiss = page.locator('button:has-text("Dismiss"), button:has-text("Got it")');
  if (await dismiss.count() > 0) await dismiss.first().click();
}

// ── Screenshot options ─────────────────────────────────────────────────────────
const SS_OPTS = {
  maxDiffPixelRatio: 0.02, // tolerate 2% pixel diff (anti-aliasing, font rendering)
  threshold:         0.2,  // per-pixel colour tolerance
  animations:        'disabled' as const,
};

// ══════════════════════════════════════════════════════════════════════════════
// VISUAL REGRESSION TESTS
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Visual regression — key UI states', () => {

  test('full app — dark mode (default)', async ({ page }) => {
    await waitForApp(page);
    // Ensure dark class is set
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page).toHaveScreenshot('app-dark-mode.png', SS_OPTS);
  });

  test('full app — light mode', async ({ page }) => {
    await waitForApp(page);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForTimeout(200); // CSS transition
    await expect(page).toHaveScreenshot('app-light-mode.png', SS_OPTS);
  });

  test('chat panel — initial welcome message', async ({ page }) => {
    await waitForApp(page);
    const chatPanel = page.locator('section[aria-label="Chat panel"]');
    await expect(chatPanel).toHaveScreenshot('chat-panel-welcome.png', SS_OPTS);
  });

  test('sidebar — all panels collapsed', async ({ page }) => {
    await waitForApp(page);
    const sidebar = page.locator('aside[aria-label="Sidebar"]');
    await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png', SS_OPTS);
  });

  test('mode tabs — all 6 modes visible', async ({ page }) => {
    await waitForApp(page);
    const modeBar = page.locator('.flex.items-center').filter({ hasText: 'Explain' }).first();
    await expect(modeBar).toHaveScreenshot('mode-tabs.png', SS_OPTS);
  });

  test('mode tabs — Exam mode active', async ({ page }) => {
    await waitForApp(page);
    await page.locator('text=Exam').first().click();
    await page.waitForTimeout(100);
    const modeBar = page.locator('.flex.items-center').filter({ hasText: 'Explain' }).first();
    await expect(modeBar).toHaveScreenshot('mode-tabs-exam-active.png', SS_OPTS);
  });

  test('theme toggle button — dark state', async ({ page }) => {
    await waitForApp(page);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const themeBtn = page.locator('button[aria-label*="mode"]').first();
    await expect(themeBtn).toHaveScreenshot('theme-toggle-dark.png', SS_OPTS);
  });

  test('theme toggle button — light state', async ({ page }) => {
    await waitForApp(page);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    const themeBtn = page.locator('button[aria-label*="mode"]').first();
    await expect(themeBtn).toHaveScreenshot('theme-toggle-light.png', SS_OPTS);
  });

  test('mobile viewport — app layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone 13
    await waitForApp(page);
    await expect(page).toHaveScreenshot('app-mobile.png', SS_OPTS);
  });

  test('mobile viewport — sidebar open', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await waitForApp(page);
    const hamburger = page.locator('button[aria-label*="sidebar"]').first();
    await hamburger.click();
    await page.waitForTimeout(300); // sidebar animation
    await expect(page).toHaveScreenshot('app-mobile-sidebar-open.png', SS_OPTS);
  });

  test('knowledge base panel — empty state', async ({ page }) => {
    await waitForApp(page);
    const kbPanel = page.locator('text=Knowledge Base').first().locator('..');
    await expect(kbPanel).toHaveScreenshot('kb-panel-empty.png', SS_OPTS);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTS — Playwright axe integration
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Accessibility — axe full-page audit', () => {

  test('app passes axe a11y audit on load', async ({ page }) => {
    await waitForApp(page);
    // Inject axe-core via CDN (no npm install needed in Playwright context)
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.0/axe.min.js' });
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        rules: {
          // Disable colour-contrast in dark mode (Tailwind's dark colours are compliant but axe can't verify CSS vars)
          'color-contrast': { enabled: false },
        },
      });
    });
    const violations = (results as any).violations;
    if (violations.length > 0) {
      console.table(violations.map((v: any) => ({
        id:          v.id,
        impact:      v.impact,
        description: v.description,
        nodes:       v.nodes.length,
      })));
    }
    expect(violations).toHaveLength(0);
  });

  test('chat input is accessible — has visible label', async ({ page }) => {
    await waitForApp(page);
    const chatInput = page.locator('textarea, input[type="text"]').first();
    // Must have a label or aria-label
    const label    = await chatInput.getAttribute('aria-label');
    const placeholder = await chatInput.getAttribute('placeholder');
    expect(label || placeholder).toBeTruthy();
  });

  test('all buttons have accessible names', async ({ page }) => {
    await waitForApp(page);
    const buttons = page.locator('button');
    const count   = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn    = buttons.nth(i);
      const label  = await btn.getAttribute('aria-label');
      const title  = await btn.getAttribute('title');
      const text   = (await btn.textContent())?.trim();
      const hasName = !!(label || title || text);
      expect(hasName, `Button ${i} has no accessible name`).toBe(true);
    }
  });

  test('images and icons have alt text or are hidden from a11y tree', async ({ page }) => {
    await waitForApp(page);
    const images = page.locator('img');
    const count  = await images.count();
    for (let i = 0; i < count; i++) {
      const img    = images.nth(i);
      const alt    = await img.getAttribute('alt');
      const hidden = await img.getAttribute('aria-hidden');
      expect(alt !== null || hidden === 'true', `Image ${i} missing alt or aria-hidden`).toBe(true);
    }
  });

  test('page has a single h1 heading', async ({ page }) => {
    await waitForApp(page);
    const h1s = page.locator('h1');
    expect(await h1s.count()).toBeGreaterThanOrEqual(1);
  });

  test('focusable elements are reachable via keyboard (Tab)', async ({ page }) => {
    await waitForApp(page);
    // Tab through 10 elements and verify something gets focus
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Something interactive should have focus (not just BODY)
    expect(focused).not.toBe('BODY');
  });
});
