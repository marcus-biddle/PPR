/**
 * Persistent cache for Sheets-derived data (localStorage + TTL).
 * Reduces Google Sheets API usage so you can browse the site without hitting quota.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export type CachedPayload<T> = { data: T; fetchedAt: number }

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPayload<unknown>
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed.data as T
  } catch {
    return null
  }
}

export function setCached(key: string, data: unknown): void {
  try {
    const payload: CachedPayload<unknown> = { data, fetchedAt: Date.now() }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function deleteCached(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function getCacheTtlMs(): number {
  return CACHE_TTL_MS
}
