/**
 * IndexedDB cache for medal totals.
 * Reduces API calls by persisting data across sessions.
 */

const DB_NAME = 'ppr-medal-cache'
const DB_VERSION = 2 // Bumped for byType breakdown
const STORE_NAME = 'totals'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours (persist across sessions to reduce API quota usage)

export type CachedMedalTotals = {
  year: number
  byYear: { name: string; gold: number; silver: number; bronze: number }[]
  byQuarter: Record<number, { name: string; gold: number; silver: number; bronze: number }[]>
  byMonth: Record<number, { name: string; gold: number; silver: number; bronze: number }[]>
  fetchedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'year' })
      }
    }
  })
}

export async function getCachedTotals(year: number): Promise<CachedMedalTotals | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(year)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      db.close()
      const cached = req.result as CachedMedalTotals | undefined
      if (!cached) {
        resolve(null)
        return
      }
      const age = Date.now() - cached.fetchedAt
      if (age > CACHE_TTL_MS) {
        resolve(null)
        return
      }
      resolve(cached)
    }
  })
}

export async function setCachedTotals(data: Omit<CachedMedalTotals, 'fetchedAt'>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const record: CachedMedalTotals = {
      ...data,
      fetchedAt: Date.now(),
    }
    const req = store.put(record)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      db.close()
      resolve()
    }
  })
}
