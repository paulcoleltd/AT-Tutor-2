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

  private tokenizeQuery(query: string): string[] {
    return Array.from(new Set(
      query
        .toLowerCase()
        .match(/\b[a-z0-9]{4,}\b/g) ?? []
    ));
  }

  private searchByTerms(query: string, items: VectorItem[], k = 5): VectorItem[] {
    const terms = this.tokenizeQuery(query);
    if (!terms.length) return [];
    const scores = new Map<string, { item: VectorItem; score: number }>();

    for (const item of items) {
      const text = item.text.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (text.includes(term)) score += 1;
      }
      if (score > 0) {
        scores.set(item.id, { item, score });
      }
    }

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(entry => entry.item);
  }

  private mergeResults(results: VectorItem[], fallback: VectorItem[], k: number): VectorItem[] {
    const seen = new Set<string>();
    const merged: VectorItem[] = [];
    for (const item of [...results, ...fallback]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
      if (merged.length >= k) break;
    }
    return merged;
  }

  searchHybrid(queryEmbedding: number[], query: string, k = 5): VectorItem[] {
    const semantic = this.search(queryEmbedding, k * 2);
    const exact    = this.searchByTerms(query, this.items, k);
    return this.mergeResults(semantic, exact, k);
  }

  searchFromSourceHybrid(queryEmbedding: number[], query: string, sourceId: string, k = 5): { items: VectorItem[]; hadSourceHits: boolean } {
    if (!this.items.length) return { items: [], hadSourceHits: false };
    const sourceItems = this.items.filter(i => i.metadata.sourceId === sourceId);
    const otherItems  = this.items.filter(i => i.metadata.sourceId !== sourceId);
    const semanticSource = this.searchByEmbedding(queryEmbedding, sourceItems, k);
    const exactSource    = this.searchByTerms(query, sourceItems, k);
    const sourceRanked   = this.mergeResults(semanticSource, exactSource, k);
    const hadSourceHits  = sourceRanked.length > 0;
    const pickedIds      = new Set(sourceRanked.map(item => item.id));
    const globalFallback = this.searchByEmbedding(queryEmbedding, otherItems, k)
      .filter(item => !pickedIds.has(item.id));
    return { items: [...sourceRanked, ...globalFallback].slice(0, k), hadSourceHits };
  }

  private searchByEmbedding(queryEmbedding: number[], items: VectorItem[], k = 5): VectorItem[] {
    if (!queryEmbedding.length) throw new Error('VectorStore.searchByEmbedding: queryEmbedding must not be empty.');
    return items
      .map(item => ({ item, score: cosineSimilarity(queryEmbedding, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(s => s.item);
  }

  search(queryEmbedding: number[], k = 5): VectorItem[] {
    if (!this.items.length) return [];
    if (!queryEmbedding.length)
      throw new Error('VectorStore.search: queryEmbedding must not be empty.');
    return this.searchByEmbedding(queryEmbedding, this.items, k);
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
