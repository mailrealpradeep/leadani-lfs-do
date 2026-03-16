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

  private isFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() <= entry.expiresAt && entry.generation === this.getGeneration(key);
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

  /**
   * Stale-while-revalidate: if fresh data exists return it immediately.
   * If stale data exists, return it immediately AND trigger background recompute.
   * Only blocks if there is no data at all (first ever call).
   */
  async getOrComputeSwr(key: string, compute: () => Promise<T>): Promise<T> {
    if (this.isFresh(key)) return this.cache.get(key)!.data;

    const staleEntry = this.cache.get(key);
    const staleData = staleEntry ? staleEntry.data : undefined;

    if (!this.computing.has(key)) {
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
    }

    if (staleData !== undefined) return staleData;

    return this.computing.get(key)!;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
      generation: this.getGeneration(key),
    });
  }

  invalidateByPrefix(prefix: string): void {
    const keysToProcess = new Set<string>();
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) keysToProcess.add(key);
    }
    for (const key of this.computing.keys()) {
      if (key.startsWith(prefix)) keysToProcess.add(key);
    }
    for (const key of keysToProcess) {
      // Bump generation to mark as stale (do NOT delete — preserve data for SWR)
      this.bumpGeneration(key);
      // Cancel any in-flight computation so next request restarts it with new gen
      this.computing.delete(key);
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
export const powerScoreLeaderboardCache = new CountsCache<any>(60);
export const powerScoreMyStatsCache = new CountsCache<any>(30);
export const customViewLeadsCache = new CountsCache<any>(45);
export const sheetsCache = new CountsCache<any>(60);
