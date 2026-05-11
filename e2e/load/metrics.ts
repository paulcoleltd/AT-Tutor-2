/**
 * In-memory metrics collector shared across parallel Playwright workers.
 * Writes results to a JSON file so the reporter can summarise after the run.
 */

import fs from 'fs';
import path from 'path';

export interface RequestMetric {
  label:      string;
  startMs:    number;
  durationMs: number;
  status:     'pass' | 'fail' | 'timeout';
  errorMsg?:  string;
}

export interface WorkerResult {
  persona:    string;
  userId:     string;
  metrics:    RequestMetric[];
  sessionMs:  number;
}

const RESULTS_FILE = path.join(process.cwd(), 'e2e', 'load', 'results.json');

export function saveWorkerResult(result: WorkerResult): void {
  let existing: WorkerResult[] = [];
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      existing = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    }
  } catch { /* first run */ }
  existing.push(result);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(existing, null, 2));
}

export function clearResults(): void {
  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);
}

export function loadResults(): WorkerResult[] {
  if (!fs.existsSync(RESULTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
}

export interface Summary {
  profile:         string;
  totalWorkers:    number;
  totalRequests:   number;
  passedRequests:  number;
  failedRequests:  number;
  timeoutRequests: number;
  errorRate:       string;
  p50Ms:           number;
  p90Ms:           number;
  p95Ms:           number;
  p99Ms:           number;
  avgMs:           number;
  minMs:           number;
  maxMs:           number;
  throughputRps:   string;
  totalDurationMs: number;
  byLabel:         Record<string, { count: number; p50: number; p90: number; errors: number }>;
}

export function buildSummary(profile: string, results: WorkerResult[]): Summary {
  const allMetrics = results.flatMap(r => r.metrics);
  const durations  = allMetrics.map(m => m.durationMs).sort((a, b) => a - b);
  const passed     = allMetrics.filter(m => m.status === 'pass').length;
  const failed     = allMetrics.filter(m => m.status === 'fail').length;
  const timeouts   = allMetrics.filter(m => m.status === 'timeout').length;
  const total      = allMetrics.length;
  const totalMs    = results.reduce((s, r) => Math.max(s, r.sessionMs), 0);

  const pct = (arr: number[], p: number) =>
    arr[Math.floor(arr.length * p / 100)] ?? 0;

  // Group by label
  const labels = new Set(allMetrics.map(m => m.label));
  const byLabel: Summary['byLabel'] = {};
  for (const label of labels) {
    const group = allMetrics.filter(m => m.label === label);
    const gd    = group.map(m => m.durationMs).sort((a, b) => a - b);
    byLabel[label] = {
      count:  group.length,
      p50:    pct(gd, 50),
      p90:    pct(gd, 90),
      errors: group.filter(m => m.status !== 'pass').length,
    };
  }

  return {
    profile,
    totalWorkers:    results.length,
    totalRequests:   total,
    passedRequests:  passed,
    failedRequests:  failed,
    timeoutRequests: timeouts,
    errorRate:       total ? `${((failed + timeouts) / total * 100).toFixed(1)}%` : '0%',
    p50Ms:           pct(durations, 50),
    p90Ms:           pct(durations, 90),
    p95Ms:           pct(durations, 95),
    p99Ms:           pct(durations, 99),
    avgMs:           total ? Math.round(durations.reduce((a, b) => a + b, 0) / total) : 0,
    minMs:           durations[0] ?? 0,
    maxMs:           durations[durations.length - 1] ?? 0,
    throughputRps:   totalMs ? (total / (totalMs / 1_000)).toFixed(2) : '0',
    totalDurationMs: totalMs,
    byLabel,
  };
}
