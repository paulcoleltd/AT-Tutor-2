import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ── Security: only VITE_API_URL is intentionally exposed to the client bundle.
// Any other VITE_* variable would be a misconfiguration — this plugin warns
// at build time if a sensitive-looking variable name is exposed.
const SAFE_VITE_VARS = new Set(['VITE_API_URL']);

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
      '/api': {
        target:    'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
