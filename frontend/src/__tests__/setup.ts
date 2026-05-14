/**
 * Vitest global setup — runs before every test file.
 */
import '@testing-library/jest-dom';
import { expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers as any);
afterEach(() => cleanup());

// ── localStorage stub ─────────────────────────────────────────────────────────
const _ls: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem:    (k: string)          => _ls[k] ?? null,
    setItem:    (k: string, v: string) => { _ls[k] = v; },
    removeItem: (k: string)          => { delete _ls[k]; },
    clear:      ()                   => { Object.keys(_ls).forEach(k => delete _ls[k]); },
    get length() { return Object.keys(_ls).length; },
  },
  writable: true,
});

// ── sessionStorage stub ───────────────────────────────────────────────────────
const _ss: Record<string, string> = {};
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem:    (k: string)          => _ss[k] ?? null,
    setItem:    (k: string, v: string) => { _ss[k] = v; },
    removeItem: (k: string)          => { delete _ss[k]; },
    clear:      ()                   => { Object.keys(_ss).forEach(k => delete _ss[k]); },
  },
  writable: true,
});

// ── crypto ────────────────────────────────────────────────────────────────────
let _uuidSeq = 0;
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => `test-${String(++_uuidSeq).padStart(8,'0')}-0000-0000-0000-000000000000`,
    getRandomValues: (a: Uint8Array) => { a.fill(1); return a; },
  },
  writable: true,
});

// ── Browser APIs not in jsdom ─────────────────────────────────────────────────
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
(global as any).IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };

Object.defineProperty(window, 'speechSynthesis', {
  value: { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] },
  writable: true,
});

Object.defineProperty(window, 'matchMedia', {
  value: (q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
  writable: true,
});

// ── fetch default mock (override per test as needed) ─────────────────────────
global.fetch = vi.fn().mockResolvedValue({
  ok: true, status: 200,
  json: async () => ({ status: 'ok' }),
  text: async () => '{}',
  body: { getReader: () => ({ read: async () => ({ done: true, value: undefined }) }) },
});
