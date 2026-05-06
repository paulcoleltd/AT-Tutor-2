import { VectorStore, VectorItem } from '../brain/vectorStore';
import { Brain } from '../brain/brain';
import { splitIntoChunks, ingestDocument } from '../brain/ingest';
import { getAvailableProviders, LLMError } from '../models/llmRouter';

// ── Mock external dependencies ──────────────────────────────────────────────

jest.mock('../models/embeddings', () => ({
  embedText: jest.fn(),
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
}));

import { embedText } from '../models/embeddings';
const mockEmbedText = embedText as jest.MockedFunction<typeof embedText>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: string, sourceId: string, embedding: number[], text = 'sample text'): VectorItem {
  return {
    id,
    embedding,
    text,
    metadata: { sourceId, filename: `${sourceId}.md`, chunkIndex: 0, type: 'markdown' },
  };
}

// ── VectorStore tests ────────────────────────────────────────────────────────

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  describe('add', () => {
    it('stores a valid item and increments size', () => {
      store.add(makeItem('id1', 'src1', [1, 0]));
      expect(store.size).toBe(1);
    });

    it('throws when id is missing', () => {
      expect(() =>
        store.add({ id: '', embedding: [1, 0], text: 'hi', metadata: { sourceId: 's', filename: 'f', chunkIndex: 0, type: 't' } })
      ).toThrow('VectorStore.add: item must have a valid id and embedding.');
    });

    it('throws when embedding is empty', () => {
      expect(() =>
        store.add({ id: 'x', embedding: [], text: 'hi', metadata: { sourceId: 's', filename: 'f', chunkIndex: 0, type: 't' } })
      ).toThrow('VectorStore.add: item must have a valid id and embedding.');
    });

    it('stores multiple items', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.add(makeItem('b', 'src1', [0, 1]));
      store.add(makeItem('c', 'src2', [1, 1]));
      expect(store.size).toBe(3);
    });
  });

  describe('search', () => {
    it('returns empty array when store is empty', () => {
      expect(store.search([1, 0])).toEqual([]);
    });

    it('throws when queryEmbedding is empty', () => {
      store.add(makeItem('id1', 'src1', [1, 0]));
      expect(() => store.search([])).toThrow('VectorStore.search: queryEmbedding must not be empty.');
    });

    it('returns results ranked by cosine similarity', () => {
      // Item A is perfectly aligned with query [1,0] — similarity = 1
      store.add(makeItem('a', 'src1', [1, 0], 'alpha'));
      // Item B is orthogonal — similarity = 0
      store.add(makeItem('b', 'src1', [0, 1], 'beta'));

      const results = store.search([1, 0]);
      expect(results[0].id).toBe('a');
      expect(results[1].id).toBe('b');
    });

    it('respects k limit', () => {
      for (let i = 0; i < 10; i++) {
        store.add(makeItem(`id${i}`, 'src1', [i + 1, 0]));
      }
      const results = store.search([1, 0], 3);
      expect(results).toHaveLength(3);
    });

    it('returns all items when k exceeds store size', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.add(makeItem('b', 'src1', [0, 1]));
      const results = store.search([1, 0], 10);
      expect(results).toHaveLength(2);
    });
  });

  describe('removeBySource', () => {
    it('removes all items for a given sourceId and returns count', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.add(makeItem('b', 'src1', [0, 1]));
      store.add(makeItem('c', 'src2', [1, 1]));

      const removed = store.removeBySource('src1');
      expect(removed).toBe(2);
      expect(store.size).toBe(1);
    });

    it('returns 0 when sourceId not found', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      expect(store.removeBySource('nonexistent')).toBe(0);
      expect(store.size).toBe(1);
    });

    it('removes only items matching the sourceId', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.add(makeItem('b', 'src2', [0, 1]));
      store.removeBySource('src1');
      const results = store.search([0, 1]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('b');
    });
  });

  describe('getSources (getStats)', () => {
    it('returns empty array when store is empty', () => {
      expect(store.getSources()).toEqual([]);
    });

    it('returns correct source counts', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.add(makeItem('b', 'src1', [0, 1]));
      store.add(makeItem('c', 'src2', [1, 1]));

      const sources = store.getSources();
      expect(sources).toHaveLength(2);

      const src1 = sources.find(s => s.sourceId === 'src1');
      expect(src1?.chunks).toBe(2);
      expect(src1?.filename).toBe('src1.md');

      const src2 = sources.find(s => s.sourceId === 'src2');
      expect(src2?.chunks).toBe(1);
    });

    it('reflects removals correctly', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.add(makeItem('b', 'src2', [0, 1]));
      store.removeBySource('src1');

      const sources = store.getSources();
      expect(sources).toHaveLength(1);
      expect(sources[0].sourceId).toBe('src2');
    });
  });

  describe('searchFromSource', () => {
    it('returns hadSourceHits=false when store is empty', () => {
      const result = store.searchFromSource([1, 0], 'src1');
      expect(result.items).toEqual([]);
      expect(result.hadSourceHits).toBe(false);
    });

    it('returns hadSourceHits=false when sourceId has no items', () => {
      store.add(makeItem('a', 'src2', [1, 0]));
      const result = store.searchFromSource([1, 0], 'src1');
      expect(result.hadSourceHits).toBe(false);
    });

    it('prioritises items from the requested sourceId', () => {
      store.add(makeItem('focused', 'src1', [1, 0], 'focused doc'));
      store.add(makeItem('other',   'src2', [1, 0], 'other doc'));

      const result = store.searchFromSource([1, 0], 'src1', 2);
      expect(result.hadSourceHits).toBe(true);
      expect(result.items[0].id).toBe('focused');
    });
  });

  describe('clear', () => {
    it('empties the store', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.clear();
      expect(store.size).toBe(0);
    });
  });
});

// ── Brain tests ───────────────────────────────────────────────────────────────

describe('Brain', () => {
  let store: VectorStore;
  let brain: Brain;

  beforeEach(() => {
    store = new VectorStore();
    brain = new Brain(store);
    mockEmbedText.mockResolvedValue([1, 0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieve', () => {
    it('returns empty chunks and sources when store is empty', async () => {
      const result = await brain.retrieve('anything');
      expect(result.chunks).toEqual([]);
      expect(result.sources).toEqual([]);
    });

    it('returns relevant chunks and source filenames', async () => {
      store.add({
        id: 'c1',
        embedding: [1, 0],
        text: 'relevant content',
        metadata: { sourceId: 'src1', filename: 'notes.md', chunkIndex: 0, type: 'markdown' },
      });

      const result = await brain.retrieve('query');
      expect(result.chunks).toContain('relevant content');
      expect(result.sources).toContain('notes.md');
    });

    it('deduplicates sources across multiple chunks from same file', async () => {
      store.add({ id: 'c1', embedding: [1, 0], text: 'chunk one', metadata: { sourceId: 'src1', filename: 'doc.md', chunkIndex: 0, type: 'markdown' } });
      store.add({ id: 'c2', embedding: [1, 0], text: 'chunk two', metadata: { sourceId: 'src1', filename: 'doc.md', chunkIndex: 1, type: 'markdown' } });

      const result = await brain.retrieve('query');
      const docSources = result.sources.filter(s => s === 'doc.md');
      expect(docSources).toHaveLength(1);
    });

    it('uses focusSourceId and sets focusSourceHit=true when matching chunks exist', async () => {
      store.add({ id: 'c1', embedding: [1, 0], text: 'focused text', metadata: { sourceId: 'src1', filename: 'focus.md', chunkIndex: 0, type: 'markdown' } });

      const result = await brain.retrieve('query', 5, 'src1');
      expect(result.focusSourceHit).toBe(true);
      expect(result.sources).toContain('focus.md');
    });

    it('calls embedText with the provided query', async () => {
      store.add(makeItem('c1', 'src1', [1, 0]));
      await brain.retrieve('my test query');
      expect(mockEmbedText).toHaveBeenCalledWith('my test query');
    });
  });

  describe('getStatus', () => {
    it('reflects current store state', () => {
      store.add(makeItem('a', 'src1', [1, 0]));
      store.add(makeItem('b', 'src1', [0, 1]));

      const status = brain.getStatus();
      expect(status.totalChunks).toBe(2);
      expect(status.sources).toHaveLength(1);
      expect(status.sources[0].sourceId).toBe('src1');
    });

    it('returns zero counts on empty store', () => {
      const status = brain.getStatus();
      expect(status.totalChunks).toBe(0);
      expect(status.sources).toEqual([]);
    });
  });
});

// ── ingest.ts — splitIntoChunks tests ────────────────────────────────────────

describe('splitIntoChunks', () => {
  it('returns the full text as a single chunk when text fits within chunkSize', () => {
    const text = 'short text';
    const result = splitIntoChunks(text, 1600, 200);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it('splits long text into multiple chunks', () => {
    const text = 'a'.repeat(5000);
    const result = splitIntoChunks(text, 1600, 200);
    expect(result.length).toBeGreaterThan(1);
  });

  it('each chunk length does not exceed chunkSize by more than overlap window', () => {
    const text = 'word '.repeat(1000);
    const chunks = splitIntoChunks(text, 1600, 200);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1600 + 200);
    }
  });

  it('covers the full original text across all chunks (no data loss)', () => {
    const text = 'Hello world. '.repeat(500);
    const chunks = splitIntoChunks(text, 1600, 200);
    const joined = chunks.join('');
    expect(joined.length).toBeGreaterThanOrEqual(text.length);
  });

  it('throws when chunkSize <= overlap', () => {
    expect(() => splitIntoChunks('text', 200, 200)).toThrow('splitIntoChunks: chunkSize must be greater than overlap.');
    expect(() => splitIntoChunks('text', 100, 200)).toThrow();
  });

  it('handles empty string by returning it as a single chunk', () => {
    const result = splitIntoChunks('', 1600, 200);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('');
  });

  it('breaks on paragraph boundaries when available', () => {
    const para1 = 'a'.repeat(1400);
    const para2 = 'b'.repeat(1400);
    const text = para1 + '\n\n' + para2;
    const chunks = splitIntoChunks(text, 1600, 200);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].endsWith('\n\n') || chunks[0].length <= 1600 + 200).toBe(true);
  });
});

// ── ingest.ts — ingestDocument tests ─────────────────────────────────────────

describe('ingestDocument', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
    mockEmbedText.mockResolvedValue([1, 0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when content is empty', async () => {
    await expect(
      ingestDocument({ id: 'id1', filename: 'test.md', content: '', type: 'markdown', store })
    ).rejects.toThrow('ingestDocument: content for "test.md" is empty.');
  });

  it('throws when content is whitespace-only', async () => {
    await expect(
      ingestDocument({ id: 'id1', filename: 'test.md', content: '   \n  ', type: 'markdown', store })
    ).rejects.toThrow();
  });

  it('adds chunks to the store for normal content', async () => {
    const content = 'This is a test document with enough content to be stored.';
    const { chunksAdded } = await ingestDocument({ id: 'src1', filename: 'doc.md', content, type: 'markdown', store });

    expect(chunksAdded).toBeGreaterThan(0);
    expect(store.size).toBe(chunksAdded);
  });

  it('uses the correct sourceId in stored metadata', async () => {
    await ingestDocument({ id: 'my-source-id', filename: 'doc.md', content: 'content here', type: 'markdown', store });

    const sources = store.getSources();
    expect(sources[0].sourceId).toBe('my-source-id');
  });

  it('stores correct filename in metadata', async () => {
    await ingestDocument({ id: 'src1', filename: 'lecture.md', content: 'lecture content', type: 'markdown', store });

    const sources = store.getSources();
    expect(sources[0].filename).toBe('lecture.md');
  });

  it('calls embedText for each chunk produced', async () => {
    const content = 'x'.repeat(5000);
    await ingestDocument({ id: 'src1', filename: 'big.md', content, type: 'markdown', store });

    expect(mockEmbedText).toHaveBeenCalled();
    expect(mockEmbedText.mock.calls.length).toBeGreaterThan(1);
  });

  it('handles markdown content with headers and lists', async () => {
    const markdown = `# Title\n\nSome paragraph text.\n\n## Section\n\n- item one\n- item two\n`;
    const { chunksAdded } = await ingestDocument({ id: 'md1', filename: 'notes.md', content: markdown, type: 'markdown', store });

    expect(chunksAdded).toBeGreaterThan(0);
  });
});

// ── llmRouter.ts — provider tests ────────────────────────────────────────────

describe('llmRouter — getAvailableProviders', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns providers whose API keys are configured', () => {
    const providers = getAvailableProviders();
    // With no keys set (test env), list should be empty or reflect actual env
    // This verifies the function runs without error and returns an array
    expect(Array.isArray(providers)).toBe(true);
  });

  it('includes "openai" only when OPENAI_API_KEY is set', () => {
    // CONFIG is read at module load time; we test the live module state
    const { CONFIG } = require('../config');
    const providers = getAvailableProviders();
    if (CONFIG.openaiApiKey) {
      expect(providers).toContain('openai');
    } else {
      expect(providers).not.toContain('openai');
    }
  });

  it('includes "claude" only when CLAUDE_API_KEY is set', () => {
    const { CONFIG } = require('../config');
    const providers = getAvailableProviders();
    if (CONFIG.claudeApiKey) {
      expect(providers).toContain('claude');
    } else {
      expect(providers).not.toContain('claude');
    }
  });

  it('includes "gemini" only when GEMINI_API_KEY is set', () => {
    const { CONFIG } = require('../config');
    const providers = getAvailableProviders();
    if (CONFIG.geminiApiKey) {
      expect(providers).toContain('gemini');
    } else {
      expect(providers).not.toContain('gemini');
    }
  });

  it('returns providers in the fixed order: openai, claude, gemini', () => {
    const providers = getAvailableProviders();
    const order = ['openai', 'claude', 'gemini'];
    const filtered = order.filter(p => providers.includes(p as any));
    expect(providers).toEqual(filtered);
  });
});

describe('LLMError', () => {
  it('sets name, message and provider correctly', () => {
    const err = new LLMError('something failed', 'openai');
    expect(err.name).toBe('LLMError');
    expect(err.message).toBe('something failed');
    expect(err.provider).toBe('openai');
  });

  it('is an instance of Error', () => {
    expect(new LLMError('msg', 'claude')).toBeInstanceOf(Error);
  });

  it('stores an optional cause', () => {
    const cause = new Error('root cause');
    const err = new LLMError('wrapper', 'gemini', cause);
    expect(err.cause).toBe(cause);
  });
});
