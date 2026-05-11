/**
 * AI Tutor Agent — Playwright Load Test Suite
 *
 * Run with:
 *   npx playwright test e2e/load/load.spec.ts --workers=20 --config=e2e/load/playwright.load.config.ts
 *
 * Or by profile:
 *   LOAD_PROFILE=peak npx playwright test e2e/load/load.spec.ts --workers=50 ...
 *
 * Results written to e2e/load/results.json
 * Summary printed to console and written to e2e/load/summary.json
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, PROFILES, PERSONAS, Profile } from './config';
import { runUserSession } from './user-journey';
import { saveWorkerResult, clearResults, loadResults, buildSummary } from './metrics';

const PROFILE_NAME = (process.env.LOAD_PROFILE ?? 'light') as Profile;
const profile      = PROFILES[PROFILE_NAME] ?? PROFILES.light;

// ── Unique user IDs ───────────────────────────────────────────────────────────

let _uidCounter = 0;
function nextUserId() { return `load-user-${++_uidCounter}-${Date.now()}`; }

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe(`Load Test — ${profile.name} (${profile.virtualUsers} users)`, () => {
  test.describe.configure({ mode: 'parallel' });

  // Clear results before first worker starts
  test.beforeAll(() => { clearResults(); });

  // Generate one test per virtual user — Playwright workers run them in parallel
  const users = Array.from({ length: profile.virtualUsers }, (_, i) => {
    const persona = PERSONAS[i % PERSONAS.length];
    const userId  = `user-${i + 1}`;
    return { index: i, persona, userId };
  });

  for (const { index, persona, userId } of users) {
    test(`Virtual user ${index + 1} — ${persona.name}`, async ({ page }) => {
      // Ramp-up: stagger start so all users don't hit the server simultaneously
      // Divide ramp window evenly across users, add jitter
      const staggerMs  = profile.rampUpMs / Math.max(profile.virtualUsers, 1);
      const jitter     = Math.random() * (staggerMs * 0.5);
      const delayMs    = index * staggerMs + jitter;
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

      const result = await runUserSession(page, persona, userId, BASE_URL);
      saveWorkerResult(result);

      // Test passes if at least 80% of requests succeeded
      const passed  = result.metrics.filter(m => m.status === 'pass').length;
      const total   = result.metrics.length;
      const passRate = total > 0 ? passed / total : 1;

      expect(
        passRate,
        `User ${userId} (${persona.name}): only ${passed}/${total} requests passed`,
      ).toBeGreaterThanOrEqual(0.8);
    });
  }

  // After all workers complete, print the summary
  test.afterAll(() => {
    const results = loadResults();
    if (results.length === 0) return;

    const summary = buildSummary(profile.name, results);
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(
      path.join(process.cwd(), 'e2e', 'load', 'summary.json'),
      JSON.stringify(summary, null, 2),
    );
    printSummary(summary);
  });
});

// ── Console reporter ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function printSummary(s: any): void {
  const line = '─'.repeat(60);
  console.log('\n' + line);
  console.log(`  LOAD TEST RESULTS — ${s.profile.toUpperCase()} profile`);
  console.log(line);
  console.log(`  Virtual users    : ${s.totalWorkers}`);
  console.log(`  Total requests   : ${s.totalRequests}`);
  console.log(`  ✅ Passed        : ${s.passedRequests}`);
  console.log(`  ❌ Failed        : ${s.failedRequests}`);
  console.log(`  ⏱  Timed out    : ${s.timeoutRequests}`);
  console.log(`  Error rate       : ${s.errorRate}`);
  console.log(line);
  console.log(`  Latency (ms)`);
  console.log(`    min  : ${s.minMs}`);
  console.log(`    avg  : ${s.avgMs}`);
  console.log(`    p50  : ${s.p50Ms}`);
  console.log(`    p90  : ${s.p90Ms}`);
  console.log(`    p95  : ${s.p95Ms}`);
  console.log(`    p99  : ${s.p99Ms}`);
  console.log(`    max  : ${s.maxMs}`);
  console.log(line);
  console.log(`  Throughput       : ${s.throughputRps} req/s`);
  console.log(`  Total duration   : ${(s.totalDurationMs / 1000).toFixed(1)} s`);
  console.log(line);
  console.log('  By endpoint:');
  for (const [label, data] of Object.entries(s.byLabel)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    const errBadge = d.errors > 0 ? ` ❌ ${d.errors} err` : '';
    console.log(`    ${label.padEnd(40)} count=${d.count}  p50=${d.p50}ms  p90=${d.p90}ms${errBadge}`);
  }
  console.log(line + '\n');
}
