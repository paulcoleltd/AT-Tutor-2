import { v4 as uuidv4 } from 'uuid';
import { embedText } from '../models/embeddings';
import { VectorStore } from './vectorStore';

const CHUNK_CHARS   = 1600;
const OVERLAP_CHARS = 200;

export interface IngestDocumentParams {
  id:       string;
  filename: string;
  content:  string;
  type:     string;
  store:    VectorStore;
}

export async function ingestDocument({
  id, filename, content, type, store,
}: IngestDocumentParams): Promise<{ chunksAdded: number }> {
  if (!content?.trim())
    throw new Error(`ingestDocument: content for "${filename}" is empty.`);

  const chunks = splitIntoChunks(content, CHUNK_CHARS, OVERLAP_CHARS);
  console.log(`[ingest] ${filename}: ${chunks.length} chunks to embed.`);

  let chunksAdded = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i].trim();
    if (!chunkText) continue;
    const embedding = await embedText(chunkText);
    store.add({ id: uuidv4(), embedding, text: chunkText, metadata: { sourceId: id, filename, chunkIndex: i, type } });
    chunksAdded++;
  }

  console.log(`[ingest] ${filename}: ${chunksAdded} chunks added.`);
  return { chunksAdded };
}

export function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  if (chunkSize <= overlap) throw new Error('splitIntoChunks: chunkSize must be greater than overlap.');
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    // Try to break on sentence/paragraph boundary
    let breakPt = end;
    if (end < text.length) {
      const window = text.slice(Math.max(0, end - 200), end);
      const paraBreak = window.lastIndexOf('\n\n');
      if (paraBreak !== -1) breakPt = Math.max(0, end - 200) + paraBreak + 2;
      else {
        const sentBreak = window.search(/[.!?]\s+[A-Z]/);
        if (sentBreak !== -1) breakPt = Math.max(0, end - 200) + sentBreak + 2;
      }
    }
    chunks.push(text.slice(start, breakPt));
    start += Math.max(1, chunkSize - overlap);
  }
  return chunks;
}
