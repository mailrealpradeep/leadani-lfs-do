export interface CustomViewsCountsMeta {
  computed_at: string;
  age_seconds: number;
}

export interface CustomViewsCountsResponse {
  counts: Record<string, number>;
  meta?: CustomViewsCountsMeta;
}

export function getCustomViewsCountsComputedAtMs(
  response: CustomViewsCountsResponse | undefined,
  dataUpdatedAt: number,
): number | undefined {
  if (response?.meta?.computed_at) {
    const parsed = Date.parse(response.meta.computed_at);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (dataUpdatedAt > 0) return dataUpdatedAt;
  return undefined;
}
