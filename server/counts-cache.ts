interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  generation: number;
}

export class CountsCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private computing = new Map<string, Promise<T>>();
  private generations = new Map<string, number>();
  private ttlMs: number;

  constructor(ttlSeconds: number = 60) {
    this.ttlMs = ttlSeconds * 1000;
  }

  private getGeneration(key: string): number {
    return this.generations.get(key) ?? 0;
  }

  private bumpGeneration(key: string): void {
    this.generations.set(key, this.getGeneration(key) + 1);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt || entry.generation !== this.getGeneration(key)) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  async getOrCompute(key: string, compute: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const existing = this.computing.get(key);
    if (existing) return existing;

    const gen = this.getGeneration(key);
    const promise = compute().then((result) => {
      if (gen === this.getGeneration(key)) {
        this.cache.set(key, {
          data: result,
          expiresAt: Date.now() + this.ttlMs,
          generation: gen,
        });
      }
      this.computing.delete(key);
      return result;
    }).catch((err) => {
      this.computing.delete(key);
      throw err;
    });

    this.computing.set(key, promise);
    return promise;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
      generation: this.getGeneration(key),
    });
  }

  invalidateByPrefix(prefix: string): void {
    const keysToInvalidate = new Set<string>();
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) keysToInvalidate.add(key);
    }
    for (const key of this.computing.keys()) {
      if (key.startsWith(prefix)) keysToInvalidate.add(key);
    }
    for (const key of keysToInvalidate) {
      this.cache.delete(key);
      this.computing.delete(key);
      this.bumpGeneration(key);
    }
  }

  invalidateAll(): void {
    for (const key of this.cache.keys()) this.bumpGeneration(key);
    for (const key of this.computing.keys()) this.bumpGeneration(key);
    this.cache.clear();
    this.computing.clear();
  }
}

export const hotLeadsCountCache = new CountsCache<{ count: number }>(60);
export const customViewsCountCache = new CountsCache<{ counts: Record<string, number> }>(60);
export const visionPipelineCache = new CountsCache<any>(60);
export const visionProgressCache = new CountsCache<any>(60);
export const visionTeamCache = new CountsCache<any>(60);
export const visionConversionCache = new CountsCache<any>(60);
