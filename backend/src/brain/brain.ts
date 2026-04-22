import { VectorStore } from './vectorStore';
import { embedText } from '../models/embeddings';
import { CONFIG } from '../config';

export interface RetrievalResult {
  chunks:  string[];
  sources: string[]; // unique filenames
}

export class Brain {
  constructor(private readonly store: VectorStore) {}

  async retrieve(query: string, k?: number): Promise<RetrievalResult> {
    const topK = k ?? CONFIG.retrievalTopK;
    if (this.store.size === 0) return { chunks: [], sources: [] };

    const queryEmbedding = await embedText(query);
    const results = this.store.search(queryEmbedding, topK);

    const chunks  = results.map(r => r.text);
    const sources = [...new Set(results.map(r => r.metadata.filename as string))];
    return { chunks, sources };
  }

  getStatus() {
    return {
      totalChunks: this.store.size,
      sources:     this.store.getSources(),
    };
  }
}
