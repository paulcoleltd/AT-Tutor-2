/**
 * secureStorage — AES-GCM encrypted localStorage wrapper.
 *
 * Threat model: protects stored PII (chat history, user profile, memory facts)
 * against physical access to the browser's localStorage SQLite files and against
 * basic browser extension attacks that read localStorage without executing JS.
 *
 * Limitation: extensions that can execute JavaScript in the page context can
 * still access the in-memory CryptoKey. Full protection requires server-side
 * storage — this is the client-side best-effort layer.
 *
 * Key strategy:
 *   - Generate a random AES-GCM-256 key once per browser origin (persisted in
 *     sessionStorage as an exported JWK so it survives page navigations but is
 *     cleared when the browser tab/session ends).
 *   - Each write generates a fresh random 96-bit IV and prepends it to the
 *     ciphertext (IV || ciphertext, base64-encoded).
 *   - Falls back to plaintext transparently if Web Crypto is unavailable.
 */

const KEY_STORAGE_KEY = '__sc_key__';
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

// CWE-330: non-extractable would be more secure but we need to export to
// sessionStorage so the key survives navigations. extractable:true is
// intentional here — the protection goal is filesystem access, not JS access.
async function getOrCreateKey(): Promise<CryptoKey | null> {
  if (typeof crypto?.subtle === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(KEY_STORAGE_KEY);
    if (stored) {
      const jwk = JSON.parse(stored) as JsonWebKey;
      return await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    }
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('jwk', key);
    sessionStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(exported));
    return key;
  } catch {
    return null;
  }
}

// Singleton promise — key is created once then reused
let _keyPromise: Promise<CryptoKey | null> | null = null;
function key(): Promise<CryptoKey | null> {
  return (_keyPromise ??= getOrCreateKey());
}

async function encrypt(plaintext: string): Promise<string> {
  const k = await key();
  if (!k) return plaintext; // fallback: store plaintext
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    k,
    ENCODER.encode(plaintext),
  );
  // Encode as base64: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(stored: string): Promise<string> {
  const k = await key();
  if (!k) return stored; // no key — treat as plaintext
  try {
    const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    const iv         = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, ciphertext);
    return DECODER.decode(plain);
  } catch {
    // Decryption failed — data may be legacy plaintext or corrupted; return as-is
    return stored;
  }
}

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      const enc = await encrypt(value);
      localStorage.setItem(key, enc);
    } catch {
      // Storage quota or other error — degrade silently
    }
  },

  async getItem(key: string): Promise<string | null> {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return decrypt(raw);
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
};

/**
 * Synchronous helpers for code paths that cannot use async/await.
 * These write/read plaintext until the key is initialised, then transparently
 * switch to encrypted on the next write. Use the async API where possible.
 */
export const secureStorageSync = {
  setItem(key: string, value: string): void {
    // Best-effort: encrypt if key already resolved, otherwise plaintext
    _keyPromise?.then(k => {
      if (!k) { localStorage.setItem(key, value); return; }
      encrypt(value).then(enc => localStorage.setItem(key, enc)).catch(() => {});
    }) ?? localStorage.setItem(key, value);
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
};
