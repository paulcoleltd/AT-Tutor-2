import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { configDefaults } from 'vitest/config';

// ── Security: only VITE_API_URL is intentionally exposed to the client bundle.
// Any other VITE_* variable would be a misconfiguration — this plugin warns
// at build time if a sensitive-looking variable name is exposed.
const SAFE_VITE_VARS = new Set(['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);

function secretScanPlugin() {
  return {
    name: 'vite-secret-scan',
    buildStart() {
      const exposed = Object.keys(process.env)
        .filter(k => k.startsWith('VITE_') && !SAFE_VITE_VARS.has(k));
      if (exposed.length > 0) {
        console.warn(
          `\n[SECURITY WARNING] Unexpected VITE_ variable(s) will be embedded in the ` +
          `client bundle: ${exposed.join(', ')}. Remove these or add to SAFE_VITE_VARS.\n`
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), secretScanPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },

  // ── Vitest configuration ────────────────────────────────────────────────────
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./src/__tests__/setup.ts'],
    exclude:     [...configDefaults.exclude, 'e2e/**'],
    // Snapshot storage alongside test files
    snapshotOptions: { snapshotFormat: { printBasicPrototype: false } },

    // ── Coverage (v8 provider — fast, no instrumentation overhead) ────────────
    coverage: {
      provider:       'v8',
      reporter:       ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],

      // ── Coverage thresholds — CI fails below these ──────────────────────────
      thresholds: {
        lines:      60,
        functions:  60,
        branches:   50,
        statements: 60,
      },
    },
  },
});
