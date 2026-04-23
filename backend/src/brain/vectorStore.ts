export interface VectorItem {
  id:        string;
  embedding: number[];
  text:      string;
  metadata:  {
    sourceId:   string;
    filename:   string;
    chunkIndex: number;
    type:       string;
    [key: string]: unknown;
  };
}

export class VectorStore {
  private items: VectorItem[] = [];

  add(item: VectorItem): void {
    if (!item.id || !item.embedding?.length)
      throw new Error('VectorStore.add: item must have a valid id and embedding.');
    this.items.push(item);
  }

  /** Search only within a specific sourceId, then fall back to global search for remaining slots */
  searchFromSource(queryEmbedding: number[], sourceId: string, k = 5): { items: VectorItem[]; hadSourceHits: boolean } {
    if (!this.items.length) return { items: [], hadSourceHits: false };
    const sourceItems  = this.items.filter(i => i.metadata.sourceId === sourceId);
    const otherItems   = this.items.filter(i => i.metadata.sourceId !== sourceId);
    const rank = (arr: VectorItem[]) =>
      arr.map(item => ({ item, score: cosineSimilarity(queryEmbedding, item.embedding) }))
         .sort((a, b) => b.score - a.score);
    const sourceRanked = rank(sourceItems).slice(0, k);
    const hadSourceHits = sourceRanked.length > 0;
    // Fill remaining slots with best global results (excluding already-picked items)
    const pickedIds = new Set(sourceRanked.map(r => r.item.id));
    const global    = rank(otherItems).filter(r => !pickedIds.has(r.item.id)).slice(0, k - sourceRanked.length);
    return { items: [...sourceRanked, ...global].map(r => r.item), hadSourceHits };
  }

  search(queryEmbedding: number[], k = 5): VectorItem[] {
    if (!this.items.length) return [];
    if (!queryEmbedding.length)
      throw new Error('VectorStore.search: queryEmbedding must not be empty.');
    return this.items
      .map(item => ({ item, score: cosineSimilarity(queryEmbedding, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(s => s.item);
  }

  removeBySource(sourceId: string): number {
    const before = this.items.length;
    this.items = this.items.filter(i => i.metadata.sourceId !== sourceId);
    return before - this.items.length;
  }

  clear(): void { this.items = []; }

  get size(): number { return this.items.length; }

  getSources(): { sourceId: string; filename: string; chunks: number; type: string }[] {
    const map = new Map<string, { filename: string; chunks: number; type: string }>();
    for (const item of this.items) {
      const { sourceId, filename, type } = item.metadata;
      const entry = map.get(sourceId) ?? { filename, chunks: 0, type: type as string };
      entry.chunks += 1;
      map.set(sourceId, entry);
    }
    return Array.from(map.entries()).map(([sourceId, v]) => ({ sourceId, ...v }));
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length)
    throw new Error(`cosineSimilarity: length mismatch (${a.length} vs ${b.length}).`);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
