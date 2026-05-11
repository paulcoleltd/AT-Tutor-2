/**
 * Reusable user journey steps for load test workers.
 * Each step records a RequestMetric so response times are captured.
 */

import { Page } from '@playwright/test';
import { RequestMetric, WorkerResult } from './metrics';
import { THINK, MESSAGES, Persona } from './config';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── Step helpers ──────────────────────────────────────────────────────────────

async function measure(
  label: string,
  metrics: RequestMetric[],
  fn: () => Promise<void>,
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    metrics.push({ label, startMs: start, durationMs: Date.now() - start, status: 'pass' });
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? String(err);
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('exceeded');
    metrics.push({
      label,
      startMs:    start,
      durationMs: Date.now() - start,
      status:     isTimeout ? 'timeout' : 'fail',
      errorMsg:   msg.slice(0, 200),
    });
  }
}

// ── Page load ─────────────────────────────────────────────────────────────────

export async function loadHomePage(page: Page, baseUrl: string, metrics: RequestMetric[]): Promise<void> {
  await measure('page_load', metrics, async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Wait for the chat input to appear — confirms app rendered
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 15_000 });
  });
  await sleep(THINK.pageLoad());
}

// ── Mode selection ────────────────────────────────────────────────────────────

export async function selectMode(
  page: Page,
  mode: Persona['mode'],
  metrics: RequestMetric[],
): Promise<void> {
  await measure(`select_mode_${mode}`, metrics, async () => {
    // Mode buttons: Explain, Quiz, Chat, Summarize, Flashcards, Exam
    const modeLabels: Record<string, string> = {
      explain: 'Explain', quiz: 'Quiz', chat: 'Chat',
      summarize: 'Summarize', exam: 'Exam', flashcard: 'Flashcards',
    };
    const label = modeLabels[mode] ?? 'Explain';
    const btn = page.locator(`button:has-text("${label}")`).first();
    if (await btn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await btn.click();
    }
  });
  await sleep(THINK.modeSwitch());
}

// ── Send a message ────────────────────────────────────────────────────────────

export async function sendMessage(
  page: Page,
  message: string,
  metrics: RequestMetric[],
  awaitResponse = true,
): Promise<void> {
  const label = `send_message_${message.length > 30 ? message.slice(0, 30) + '…' : message}`;
  await measure(label, metrics, async () => {
    const input = page.locator('textarea').first();
    await input.fill(message);
    await sleep(THINK.typeShortMsg());

    // Click send or press Enter
    const sendBtn = page.locator('button[aria-label="Send"], button:has-text("Send")').first();
    if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await input.press('Enter');
    }

    if (awaitResponse) {
      // Wait for AI to start and finish streaming — look for the response bubble
      await page.waitForSelector(
        '.chat-scroll .prose, .chat-scroll p, [role="log"] p',
        { timeout: 45_000 },
      );
      // Wait for streaming to stop — no more "…" spinner
      await page.waitForFunction(
        () => !document.querySelector('.animate-bounce, .streaming'),
        { timeout: 60_000, polling: 500 },
      ).catch(() => {}); // non-fatal if streaming indicator doesn't exist
    }
  });
  await sleep(THINK.readResponse());
}

// ── Exam journey ──────────────────────────────────────────────────────────────

export async function runExamJourney(
  page: Page,
  metrics: RequestMetric[],
): Promise<void> {
  await selectMode(page, 'exam', metrics);
  await sendMessage(page, 'test me on cloud computing basics', metrics, true);
  // Simulate answering exam questions (Answer Pad)
  await sleep(THINK.examAnswer());
  // Look for Answer Pad textarea
  const padTextarea = page.locator('textarea').filter({ hasText: 'Q1:' }).first();
  if (await padTextarea.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await measure('fill_answer_pad', metrics, async () => {
      await padTextarea.fill('Q1: A\nQ2: True\nQ3: Cloud computing allows scalable resources on demand\nQ4: B\nQ5: C');
      await sleep(THINK.typeShortMsg());
      const submitBtn = page.locator('button:has-text("Submit for Grading")').first();
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForSelector('text=Grading', { timeout: 10_000 }).catch(() => {});
      }
    });
  }
}

// ── Full user session ─────────────────────────────────────────────────────────

export async function runUserSession(
  page: Page,
  persona: Persona,
  userId: string,
  baseUrl: string,
): Promise<WorkerResult> {
  const metrics: RequestMetric[] = [];
  const sessionStart = Date.now();

  const domainMessages = MESSAGES[persona.domain] ?? MESSAGES.cloud;

  // Page load
  await loadHomePage(page, baseUrl, metrics);

  // Dismiss Setup Guide if it appears
  const dismissBtn = page.locator('button:has-text("Continue without AI"), button:has-text("Continue without signing in")').first();
  if (await dismissBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await dismissBtn.click();
  }

  if (persona.mode === 'exam') {
    await runExamJourney(page, metrics);
  } else {
    // Select mode
    await selectMode(page, persona.mode, metrics);

    // Send a sequence of messages with realistic think times
    const msgCount = persona.sessions + Math.floor(Math.random() * 2);
    for (let i = 0; i < msgCount; i++) {
      const msg = domainMessages[i % domainMessages.length];
      await sendMessage(page, msg, metrics, true);
      if (i < msgCount - 1) await sleep(THINK.readResponse());
    }

    // Occasionally switch to quiz mode mid-session (30% chance)
    if (persona.mode === 'explain' && Math.random() < 0.3) {
      await selectMode(page, 'quiz', metrics);
      await sendMessage(page, `quiz me on ${domainMessages[0]}`, metrics, true);
    }
  }

  return {
    persona:   persona.name,
    userId,
    metrics,
    sessionMs: Date.now() - sessionStart,
  };
}
